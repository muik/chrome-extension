function parsePage(html, page, orders, itemMap) {
  var item_ids = null;
  var detail = $('<div>' + html + '</div>');

  detail.find('tr.package.except').each(function(i) {
    var tr = $(this);
    var group = tr.children('th.deal_info').first();
    if (group.length == 1) {
      var date = group.find('.dt strong').text();
      var time = group.find('.date_num i').text();
      var id = group.find('.buy_num strong').text();
      item_ids = [];
      orders.push({
        id: id,
        datetime: date.replace(/\./g, '-') + ' ' + time.replace(/[\(\)]/g, ''),
        item_ids: item_ids
      });
    }

    var a = tr.find('h4 a');
    var link = a.attr('href').replace(/\?.+/, '');
    var id = link.match(/deal\/(\d+)/)[1];
    item_ids.push(id);

    if (id in itemMap != true) {
      itemMap[id] = {
        id: id,
        name: a.text().trim()
      };
    }
  });

  var hasNext = detail.find(
    '.paginate_regular a[href="javascript:goPage(' + (page + 1) + ');"]')
    .length > 0;
  return hasNext;
}

function requestPage(page) {
  var url = "https://login.ticketmonster.co.kr/user/buyInfo/buyList?type=delivery&page=" + page
    + "&range=&deliveryStatusType=&ticketStatusType=&mainBuySrl=&conditionType=&_=1532840707088"
  return Promise.resolve($.ajax(url));
}

function getOrders() {
  var orders = [];
  var itemMap = {};

  function onPageLoaded(html, page) {
    var hasNext = parsePage(html, page, orders, itemMap);
    if (!hasNext) {
      return { orders: orders, itemMap: itemMap };
    }
    var nextPage = page + 1;
    return requestPage(nextPage).then(function(html) {
      return onPageLoaded(html, nextPage);
    });
  }

  var page = 1;
  return requestPage(page).then(function(html) {
    return onPageLoaded(html, page);
  });
}

function saveOrders(data) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.set({
      orders: JSON.stringify(data['orders']),
      itemMap: JSON.stringify(data['itemMap']),
      parsedTime: Date.now()
    }, function() {
      resolve(data);
    });
  });
}

function getLocalStorage(key) {
  return new Promise(function(resolve, reject) {
    chrome.storage.local.get(key, resolve);
  });
}

function getOrdersCached() {
  return getLocalStorage('parsedTime').then(function(result) {
    var parsedTime = result['parsedTime'];

    if (typeof parsedTime == 'undefined' || Date.now() - parsedTime > 4 * 60 * 60 * 1000) {
      return getOrders().then(saveOrders);
    } else {
      return getLocalStorage(['orders', 'itemMap']).then(function(result) {
        result['orders'] = JSON.parse(result['orders']);
        result['itemMap'] = JSON.parse(result['itemMap']);
        return result;
      }).catch(function() {
        return getOrders().then(saveOrders);
      });
    }
  });
}

getOrdersCached().then(console.log);
