$('li.deal_item').each(function(i) {
  var li = $(this);
  var tag = li.find('.deal_item_sticker_bottom.convenient')[0];
  if (typeof tag != 'object') {
    return;
  }
  if (tag.innerText.search('슈퍼') != 0) {
    return;
  }
  var href = li.children('a.deal_item_anchor')[0].href
  href += '&put_cart=1';
  li.append('<a href="' + href + '" class="put-cart" target="_blank">카트담기</a>');
});
