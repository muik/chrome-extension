function preprocess(data) {
  return data;

  const itemMap = data['itemMap'];
  const itemIndexMap = {};
  const itemIds = Object.keys(itemMap);
  const itemsCount = itemIds.length;

  itemIds.forEach(function(id, i) {
    itemIndexMap[id] = i;
  });

  const orders = data['orders'].reverse().map(function(order) {
    return {
      'items': order['itemIds'].map(x => itemIndexMap[x]),
      'ts': Date.parse(order['datetime'])
    };
  });
  const ordersCount = orders.length;

  const xs = [];
  const ys = [];

  for (var i=1; i < ordersCount; i++) {
    const order = orders[i];
    const preOrder = orders[i-1];

    const items = new Set(order['items']);
    const preItems = preOrder['items'];

    const negativeItems = Array.from({length: itemsCount}, (v, k) => k+1).filter(x => !items.has(x)); 
    // TODO

  }

}

//getOrdersCached().then(preprocess).then(console.log);
