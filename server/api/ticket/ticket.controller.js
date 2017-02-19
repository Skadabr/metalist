'use strict';

import Ticket from './../models/ticket.model';
import * as config from "../../config/environment"
import * as barcode from 'bwip-js';
import * as _ from 'lodash';
import liqpay from '../../liqpay';
import * as log4js from 'log4js';

const logger = log4js.getLogger('Ticket');

function respondWithResult(res, statusCode) {
    statusCode = statusCode || 200;
    return function (entity) {
        if (entity) {
          logger.info('respondWithResult '+entity);
            return res.status(statusCode).json(entity);
        }
    };
}

function handleError(res, statusCode) {
    statusCode = statusCode || 500;
    return function (err) {
      logger.error('handleError '+err);
        res.status(statusCode).send(err);
    };
}

function handleEntityNotFound(res) {
    return function (entity) {
      logger.info("handleEntityNotFound "+ entity);
        if (!entity) {
            res.status(404).end();
            return null;
        }
        return entity;
    };
}

export function index(req, res) {
    return Ticket.find().exec()
        .then(tickets => {
            var result = _.map(tickets, (ticket) => {

                var paymentParams = {
                    'action': 'pay',
                    'amount': '0.01',

                    'currency': 'UAH',
                    'description': ticket.text,
                    'order_id': ticket.id,
                    'sandbox': config.liqpay.sandboxMode,
                    'server_url': config.liqpay.callbackUrl,
                    'result_url': config.liqpay.redirectUrl,
                };


                return {
                    '_id': ticket.id,
                    'text': ticket.text,
                    'available': ticket.available,
                    'used': ticket.used,
                    'code': ticket.code,
                    'buyNowLink': ticket.available ? liqpay.generatePaymentLink(paymentParams) : null
                };
            });

            return res.status(200).json(result);
        })
        .catch(handleError(res));
}

export function getReservedtickets(req, res) {
  let matchId = req.params;
      //sectorName = req.body.sectorName;
  console.log('output', matchId);
  return Ticket.find().exec()
    .then(respondWithResult(res))
    .catch(handleError(res))
}

export function print(req, res, next) {
    return Ticket.findOne({code: req.params.code, available: false}).exec()
        .then(handleEntityNotFound(res))
        .then((ticket) => {
            if(ticket) {

                barcode.toBuffer({
                    bcid:        'code128',       // Barcode type
                    text:        ticket.code,     // Text to encode
                    scale:       3,               // 3x scaling factor
                    height:      10,              // Bar height, in millimeters
                    includetext: true,            // Show human-readable text
                    textxalign:  'center',        // Always good to set this
                    textsize:    13               // Font size, in points
                }, function (err, png) {
                    // png is a Buffer. can be saved into file if needed  fs.writeFile(ticket._id + '.png', png)

                    if (err) {
                        return res.status(500).send('Could not generate ticket');
                    } else {

                        return res.render('ticket/print', {
                            ticket: ticket,
                            barcodeUri: png.toString('base64'),
                        })

                    }
                });
            }
        })
        .catch(handleError(res));
}

export function use(req, res, next) {
    let dateNow = new Date();

    return Ticket.findOne({accessCode: req.params.code, status: 'paid'})
                 .where({$and: [
                   {'valid.from': { $lte: dateNow }},
                   {'valid.to': { $gt: dateNow }}
                 ]})
                 .exec()
                 .then((ticket) => {
                     if(!ticket) {
                       return res.status(200).json({message: 'Ticket not found'});
                     }
                   ticket.status = 'used';
                   return ticket.save()
                     .then((ticket) => {
                       let result = {
                         'seat': ticket.seat,
                         'headLine': ticket.match.headline,
                         'used': ticket.used,
                         'code': ticket.accessCode,
                         'amount': ticket.amount
                       };
                       return res.status(200).json(result);
                     });
                 })
                 .catch(handleError(res));
}

export function getTicketsForCheckMobile(req, res) {
  let dateNow = new Date();

  return Ticket.find({status: 'new'})
               .where({$and: [
                 {'valid.from': { $lte: dateNow }},
                 {'valid.to': { $gt: dateNow }}
               ]})
               .exec()
               .then(tickets => {
                 let result = _.map(tickets, (ticket) => {

                   return {
                     '_id': ticket.id,
                     'seat': ticket.seat,
                     'headLine': ticket.match.headline,
                     'used': ticket.used,
                     'code': ticket.accessCode,
                     'amount': ticket.amount
                   };
                 });

                 return res.status(200).json(result);
               })
               .catch(handleError(res));
}

export function getCountPaidOrders(req, res) {
  let date = new Date(req.params.date);

  let countOrdersPromise =  Ticket.aggregate([
    {$match: {status: 'paid', 'match.date': date}},
    {$project: {tribune: '$seat.tribune'}},
    {$group: {_id: "$tribune", number: {$sum: 1}}}])
    .then(handleEntityNotFound(res));

  let totalPricePromise  =  Ticket.aggregate([
    {$match: {status: 'paid', 'match.date': date}},
    {$project: {amount: 1, _id: 0, 'match.headline': 1}},
    {$group: {_id: '$match.headline', number: {$sum: '$amount'}}}
    ])
    .then(handleEntityNotFound(res));

  Promise
    .all([countOrdersPromise, totalPricePromise])
    .then(([count, total]) => {
      let statistic = {};

      count.map(chain => {
        statistic[chain._id] =  chain.number;
      });
      return {
              stadium: statistic,
              headline: total[0]._id,
              totalSum: total[0].number
             };
    })
    .then(respondWithResult(res))
    .catch(handleError(res))
  ;
}