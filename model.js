emb_dim = 32
dropout_rate = 0.2

const ds = new Dataset(data);

const input = tf.input({shape: [5]});
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

var x = tf.layers.concatenate().apply([recent_item_emb, current_item_emb, item_emb], -1);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
x = tf.layers.dense({units: emb_dim}).apply(x);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
x = tf.layers.dense({units: Math.floor(emb_dim / 2)}).apply(x);
x = tf.layers.batchNormalization({axis: -1}).apply(x);
x = tf.layers.dropout({rate: dropout_rate}).apply(x);
const predictions = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(x);

const inputs = [input_recent_items, input_current_items, input_item];
const outputs = [predictions];
const model = tf.model({inputs: inputs, outputs: outputs});
model.compile({optimizer: 'adam', loss: 'meanSquaredError'})

async function train() {
  console.log('train');
  var batchIterator = ds.batch(32);

  for (let batch of batchIterator) {
    let x = batch['inputs'];
    let y = batch['outputs'];
    const h = await model.fit(x, y);
    console.log("Loss after Epoch : " + h.history.loss[0]);
  }
}

async function predict() {
  console.log('predict');
  var batchIterator = ds.batch();
  var results = await model.predict(batchIterator.next().value['inputs']);
  console.log(results.print());
}

train().then(predict);
