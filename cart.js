function parsePage(html, page, orders, itemMap) {
  var itemIds = null;
  var detail = $('<div>' + html + '</div>');

  detail.find('tr.package.except').each(function(i) {
    var tr = $(this);

    // 환불완료는 무시
    if (tr.children('th.over').first().length > 0) {
      return true;
    }

    var group = tr.children('th.deal_info').first();
    if (group.length == 1) {
      var date = group.find('.dt strong').text();
      var time = group.find('.date_num i').text();
      var id = group.find('.buy_num strong').text();
      itemIds = [];
      orders.push({
        id: id,
        datetime: date.replace(/\./g, '-') + ' ' + time.replace(/[\(\)]/g, ''),
        itemIds: itemIds
      });
    }

    tr.find('.ticket_lst > li').each(function(i) {
      var li = $(this);
      var m = li.find('a.pop_link').attr('href').match(/\('\d+','(\d+)','(\d+)/);
      var id = m[1] + '-' + m[2];
      var name = li.find('.detail > .tit > strong').text().trim();
      itemIds.push(id);

      if (id in itemMap != true) {
        itemMap[id] = {
          id: id,
          name: name
        };
      }
    });
  });

  var hasNext = detail.find(
    '.paginate_regular a[href="javascript:goPage(' + (page + 1) + ');"]')
    .length > 0;
  return hasNext;
}

function requestPage(page) {
  // range: 2 - 3개월, 3 - 6개월
  var url = "https://login.ticketmonster.co.kr/user/buyInfo/buyList?type=delivery&page=" + page
    + "&range=3&_=1532840707088";
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

function getOrdersCached(noCache=false) {
  return getLocalStorage('parsedTime').then(function(result) {
    var parsedTime = result['parsedTime'];

    if (noCache || typeof parsedTime == 'undefined' || Date.now() - parsedTime > 4 * 60 * 60 * 1000) {
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
