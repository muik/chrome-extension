var dom = $('div.item.total strong[data-role="resultPrice"]');
dom.on("DOMSubtreeModified", function(e) {
  if (this.textContent.length > 1) {
    dom.off('DOMSubtreeModified');
    $('div.deal_topinfo button[data-type="addToCart"]')[0].click();
  }
});
