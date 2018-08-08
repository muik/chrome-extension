function addCardButton(i) {
  var li = $(this);
  var mart = li.find('span.label_logo.mart')[0];
  if (typeof mart != 'object') {
    return;
  }
  var href = li.children('a.anchor')[0].href
  href += '&add_cart=1';
  li.append('<a href="' + href + '" class="put-cart" target="_blank">카트담기</a>');
}

var section = $('div.ct_wrap section.search_deallist');

if (section.find('li.item:first > a').length > 0) {
  section.find('.deallist_wrap:first li.item').each(addCardButton);
} else {
  var dom = $('div.ct_wrap');
  dom.on("DOMSubtreeModified", function(e) {
    // jQuery selector trigger DOMSubtreeModified
    var section = this.querySelector('section.search_deallist');
    if (section && section.querySelector('li.item > a')) {
      dom.off('DOMSubtreeModified');
      $(section).find('.deallist_wrap:first li.item').each(addCardButton);
    }
  });
}
/*
*/
