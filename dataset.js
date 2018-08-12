const item_ids = Object.keys(data['itemMap']);
const item_index_map = new Map(item_ids.map((id, i) => [id, i]));
/*
const item_index_map = item_ids.map((id, i) => [id, i]).reduce(function (o, x) {
  o[x[0]] = x[1];
  return o;
}, {});
*/

const orders = data['orders'];
orders.reverse();

const item_ids_list = orders.map(order => order['itemIds']);
const items_list = item_ids_list.map(ids => ids.map(id => item_index_map.get(id)+1));
const items_count_list = items_list.map(items => items.length);

const RECENT_ITEMS_COUNT = Math.max.apply(null, items_count_list);
const RECENT_DAYS = 7
const TOTAL_ITEMS_COUNT = item_ids.length;

const all_items = tf.range(1, TOTAL_ITEMS_COUNT + 1);

function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function current_prob_count(count) {
  if (count < 1 || randint(0,1) < 1) {
    return 0;
  }
  return randint(1, count);
}

function setArrayToTensor(tensor, array) {
  const count = array.length;
  const buffer = tensor.buffer();
  for (var i=0; i < count; i++) {
    buffer.set(array[i], i);
  }
}

function setdiff1d(ar1, ar2) {
  const set = new Set(ar2);
  return ar1.filter(x => !set.has(x));
}

Array.prototype.shuffle = arr => arr.sort(() => Math.random() - 0.5);

const times = orders.map(order => Date.parse(order['datetime'] + ' +0900'));
const msPerDay = 24 * 60 * 60 * 1000;
const days = times.map(t => (t - times[0]) / msPerDay);
const after_days = days.slice(1).map((v, i) => v - days[i]);

function* dataset_generator() {
  for (const i in items_list.slice(1)) {
    const items = items_list[parseInt(i)+1];
    const recent_items = tf.zeros([RECENT_ITEMS_COUNT], dtype='int32');
    if (after_days[i] <= RECENT_DAYS) {
      setArrayToTensor(recent_items, items_list[i]);
    }

    // positive
    const items_count = items.length;
    for (const item of items) {
      const current_items = tf.zeros([RECENT_ITEMS_COUNT], dtype='int32');
      const count = current_prob_count(items_count - 1);
      if (count > 0) {
        setArrayToTensor(current_items, setdiff1d(items, [item]).slice(0, count));
      }
      yield [recent_items, current_items, item, 1.0];
    }

    // negative
    var negative_items = setdiff1d(all_items, items);
    negative_items = negative_items.shuffle().slice(0, Math.min(negative_items.length, items.length * 2));
    for (const item of negative_items) {
      current_items = tf.zeros([RECENT_ITEMS_COUNT], dtype='int32');
      count = current_prob_count(items_count);
      if (count > 0) {
        setArrayToTensor(current_items, items.slice(0, count));
      }
      yield [recent_items, current_items, item, 0.0];
    }
  }
}
