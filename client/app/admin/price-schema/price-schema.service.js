export default class PriceSchemaService {

  constructor($http) {
    'ngInject';
    this.$http = $http;

    this.colors = [{color: '#ff972f', colorName: 'green', price: '30'},
      {color: '#ffcc00', colorName: 'violet', price: '50'},
      {color: '#54aa6a', colorName: 'yellow', price: '80'},
      {color: '#6f89c0', colorName: 'blue', price: '100'},
      {color: '#8b54aa', colorName: 'red', price: '150'}
    ];

  }

  loadPrices() {
    //remake post
    return this.$http.get('/api/priceSchema');
  }

  savePriceSchema(schema) {
    return this.$http({
      method: 'PUT',
      url: '/api/priceSchema/' + schema.name,
      data: {
        schema: schema
      },
      headers: {'Accept': 'application/json'}
    });
  }

  getPriceBySector(tribuneName, sectorNumber, priceSchema) {

    if (!priceSchema['tribune_' + tribuneName]) {
      return undefined;
    }

    if (!priceSchema['tribune_' + tribuneName]['sector_' + sectorNumber]) {
      return priceSchema['tribune_' + tribuneName].price;
    } else {
      if (!priceSchema['tribune_' + tribuneName]['sector_' + sectorNumber].price) {
        return priceSchema['tribune_' + tribuneName].price;
      }
      return priceSchema['tribune_' + tribuneName]['sector_' + sectorNumber].price;
    }
  }

  getColorByPrice(price) {
    return this.colors
      .filter(color => color.price == price)
      .map(color => color.color)[0];
  }

}
