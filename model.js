emb_dim = 32
dropout_rate = 0.2

const input = tf.input({shape: [5]});
const input_recent_items = tf.input({shape: [RECENT_ITEMS_COUNT], name: 'recent_items'});
const input_current_items = tf.input({shape: [RECENT_ITEMS_COUNT], name: 'current_items'});
const input_item = tf.input({shape: [1], name: 'item'});

const embedding = tf.layers.embedding({
  inputDim: TOTAL_ITEMS_COUNT+1,
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

function* dataset(batch_size) {
  let x1s = [];
  let x2s = [];
  let x3s = [];
  let ys = [];
  /*
  const gen = dataset_generator();
  for (let i=0; i < batch_size; i++) {
    let item = gen.next();
    if (item['done']) {
      break;
      return;
    }
  }
  */
  for (let item of dataset_generator()) {
    var x1 = d.value[0].expandDims();
    var x2 = d.value[1].expandDims();
    var x3 = d.value[2];
    var y = d.value[3];
    x1s.push(x1);
    x2s.push(x2);
    x3s.push(x3);
    ys.push(y);
  }
  x1s = tf.concat(x1s);
  x2s = tf.concat(x2s);
  x3s = tf.tensor1d(x3s, 'int32').expandDims(1);
  ys = tf.tensor1d(ys, 'float32').expandDims(1);
  return {inputs: [x1s, x2s, x3s], outputs: [ys]}
}
//var ds = gen_dataset();
//var results = model.fit([d1, d2, d3]);

const gen = dataset_generator();
var d = gen.next();
var d1 = d.value[0].expandDims();
var d2 = d.value[1].expandDims();
var d3 = tf.tensor2d([d.value[2]], [1,1]);

var results = model.predict([d1, d2, d3]);
console.log(results.print());
