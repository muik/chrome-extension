$('li.item').each(function(i) {
  var li = $(this);
  var mart = li.find('span.label_logo.mart')[0];
  console.log(mart);
  if (typeof mart != 'object') {
    return;
  }
  var href = li.children('a.anchor')[0].href
  href += '&add_cart=1';
  li.append('<a href="' + href + '" class="put-cart" target="_blank">카트담기</a>');
});
