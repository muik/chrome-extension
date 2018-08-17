function getCurrentItems() {
  const script = $('script[type="text/javascript"]').not('[src]')[1].innerText;
  const m = script.match(/__CartList = ({.+);\n/);
  const cart = JSON.parse(m[1]);
  const deals = cart['dealGroupsWrapper'][0]['dealsWrapper'];
  return deals.map(x => x['mainDealSrl']+'_'+x['dealSrl']);
}

console.log(getCurrentItems());
