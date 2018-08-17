const emb_dim = 32*2;
const dropout_rate = 0.2;

const ds = new Dataset(data);

const input_recent_items = tf.input({shape: [ds.recentItemsCount], name: 'recent_items'});
const input_current_items = tf.input({shape: [ds.recentItemsCount], name: 'current_items'});
const input_item = tf.input({shape: [1], name: 'item'});

const embedding = tf.layers.embedding({
  inputDim: ds.totalItemsCount+1,
  outputDim: emb_dim,
  embeddingsRegularizer: 'l1l2',
  maskZero: true
});

class MeanEmbedding extends tf.layers.Layer {
  constructor(embedding) {
    super({});
    this.embedding = embedding;
  }

  computeOutputShape(inputShape) {
    return [inputShape[0], this.embedding.outputDim];
  }

  call(inputs, kwargs) {
    this.invokeCallHook(inputs, kwargs);
    inputs = inputs[0];
    const mask = inputs.greater(0).toFloat();
    const count = mask.sum(-1, true).add(0.000001);
    const emb = this.embedding.apply(inputs).sum(1)
    return emb.div(count);
  }

  getClassName() {
    return 'MeanEmbedding';
  }
}

const mean_embedding = new MeanEmbedding(embedding);

const recent_item_emb = mean_embedding.apply(input_recent_items)
const current_item_emb = mean_embedding.apply(input_current_items)
const item_emb = mean_embedding.apply(input_item)

let denseActivation = null;
var x = tf.layers.concatenate().apply([recent_item_emb, current_item_emb, item_emb], -1);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
x = tf.layers.dense({units: emb_dim, activation: denseActivation}).apply(x);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
x = tf.layers.dense({units: Math.floor(emb_dim / 2), activation: denseActivation}).apply(x);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
const predictions = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(x);

const inputs = [input_recent_items, input_current_items, input_item];
const outputs = [predictions];
const model = tf.model({inputs: inputs, outputs: outputs});
model.compile({optimizer: 'adam', loss: 'meanSquaredError'})

Array.prototype.mean = function() {
  return this.reduce((a, b) => a + b) / this.length;
};

async function train() {
  console.log('train');
  const batchSize = 128;

  for (let i = 1; i < 30; ++i) {
    var batchIterator = ds.batch(batchSize);
    let h;
    const losses = [];
    for (let batch of batchIterator) {
      let x = batch['inputs'];
      let y = batch['outputs'];
      const h = await model.fit(x, y, {batchSize: batchSize, epochs: 1});
      const loss = h.history.loss[0];
      losses.push(loss);
    }
    console.log("Loss after Epoch " + i + " : " + losses.mean());
  }
}

async function predict() {
  console.log('predict');
  for (let d of ds.batch(1)) {
    const totalItemsCount = ds.totalItemsCount;
    const x1 = d['inputs'][0].tile([totalItemsCount, 1]);
    const x2 = d['inputs'][1].tile([totalItemsCount, 1]);
    const x3 = ds.allItems().expandDims(1);
    let names = d['inputs'].map(x => ds.idxToName(x));
    let outputs = d['outputs'][0].buffer().values;
    let results = await model.predict([x1, x2, x3]);
    let predictions = results.buffer().values;
    console.log(names[0]);
    console.log(names[1]);
    console.log(ds.idxToName(x3).map((v, i) => [v, predictions[i]]).sort((x1, x2) => x2[1] - x1[1]));
    break;
  }
}

train().then(predict);
