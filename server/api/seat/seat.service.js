'use strict';

import {RESERVE, PAID} from '../seat/seat.constants';
import Promise from 'bluebird';
import {StadiumMetalist} from '../../stadium/metalist';
import {StadiumDinamo} from '../../stadium/dinamo';
import {StadiumSolar} from '../../stadium/solar';
import Seat from '../seat/seat.model';
import * as matchService from '../match/match.service';
import * as priceSchemaService from '../priceSchema/priceSchema.service';
import moment from 'moment';

export function getReservedSeats(matchId, sector) {
  return matchService.findById(matchId)
    .then((match) => {
      return match.abonement ?
        Seat.find({reservedUntil: {$gte: new Date()}, sector: sector}) :
        Seat.find({reservedUntil: {$gte: new Date()}, match: matchId, sector: sector});
    });
}

export function getByMatchId(matchId) {
  return Seat.find({match: matchId});
}

export function findForMatchBySlug(slug, matchId) {
  return Seat.findOne({slug: slug, match: matchId})
    .populate('match');
}

export function findSeatOrCreate(slug, matchId, data) {
  return findForMatchBySlug(slug, matchId)
    .then(seat => {
      if (seat) {
        return seat;
      } else {
        const {tribune, sector, row} = data;
        if (!seatExists(tribune, sector, row, data.seat)) {
          return null;
        }
        return createSeat(tribune, sector, {name: row}, data.seat, {id: matchId})
          .then(() => findForMatchBySlug(slug, matchId)).then(seat => {
            return seat;
          });
      }
    })
}

export function extendReservationTime(seats, reservedByCart) {
  return Promise.all(seats.map(seat => {
    return findForMatchBySlug(seat.slug, seat.match.id)
      .then(seat => {
        if (seat.reservedByCart !== reservedByCart && seat.reservationType !== 'PAID') {
          throw new Error('notReservedSeat');
        }
        seat.reservedUntil = moment().add(30, 'minutes');
        return seat.save();
      });
  }));
}

//@TODO need (включить в запрос expired_date - Время до которого клиент может оплатить счет по UTC. Передается в формате 2016-04-24 00:00:00) также имеет смысл в  ограничении разового заказа на не более скажем 40 мест
export function reserveSeatsAsPaid(seats, reservedByCart) {
  return Promise.all(seats.map(seat => {
    return Promise.all([
      findForMatchBySlug(seat.slug, seat.match),
      matchService.findById(seat.match)
    ])
      .then(([seat, match]) => {
        if (seat.reservedByCart !== reservedByCart && seat.reservationType !== 'PAID') {
          throw new Error('notReservedSeat');
        }
        seat.reservedUntil = moment(match.date).add(4, 'h');
        seat.reservationType = PAID;
        return seat.save();
      });
  }));
}

export function clearReservation(seat) {
  seat.reservedByCart = '';
  seat.reservedUntil = moment().subtract(10, 'minutes');

  return seat.save();
}

export function findByCartAndMatchId(publicId, slug, matchId) {
  return Seat.findOne({reservedByCart: publicId, slug: slug, match: matchId});
}

export function reserveSeatAsReserve(seat, reserveDate, publicId) {
  return priceSchemaService.getSeatPrice(seat)
    .then(price => {
      if (!price) {
        throw new Error("price not found");
      }
      seat.reservedByCart = publicId;
      seat.reservedUntil = reserveDate;
      seat.reservationType = RESERVE;
      seat.price = price;

      return seat.save();
    })
}

export function createSeatsForMatch(match) {
  console.log("-----------------------/// add seats for match: ", match.id);

  return createStadiumSeatsForMatch(match)
    .catch(err => {
      if (err) {
        throw new Error(err);
      }
    });
}

export function deleteByMatchId(matchId) {
  console.log("-----------------------/// delete seats for previous match: ", matchId);
  return Seat.deleteMany({match: matchId})
}

// private function
function createStadiumSeatsForMatch(match) {
  console.log("createStadiumSeatsForMatch(match)  ", match);
  let parameters = [];

  if (match.stadiumName === 'metalist') {
    let Stadium = StadiumMetalist;
    for (let tribune in Stadium) {
      for (let sector in Stadium[tribune]) {
        if (Stadium[tribune][sector].rows) {
          Stadium[tribune][sector].rows.forEach(row => {
            parameters.push({
              tribune: Stadium[tribune].name,
              sector: Stadium[tribune][sector].name,
              row: row,
              match: match
            });
          })
        }
      }
    }
  } else {
    if (match.stadiumName == 'solar') {
      let Stadium = StadiumSolar;
      for (let tribune in Stadium) {
        for (let sector in Stadium[tribune]) {
          if (Stadium[tribune][sector].rows) {
            Stadium[tribune][sector].rows.forEach(row => {
              parameters.push({
                tribune: Stadium[tribune].name,
                sector: Stadium[tribune][sector].name,
                row: row,
                match: match
              });
            })
          }
        }
      }
    } else {
      let Stadium = StadiumDinamo;
      for (let tribune in Stadium) {
        for (let sector in Stadium[tribune]) {
          if (Stadium[tribune][sector].rows) {
            Stadium[tribune][sector].rows.forEach(row => {
              parameters.push({
                tribune: Stadium[tribune].name,
                sector: Stadium[tribune][sector].name,
                row: row,
                match: match
              });
            })
          }
        }
      }
    }
  }

  //for (let tribune in Stadium) {
  //  for (let sector in Stadium[tribune]) {
  //    if (Stadium[tribune][sector].rows) {
  //      Stadium[tribune][sector].rows.forEach(row => {
  //        parameters.push({tribune: Stadium[tribune].name, sector: Stadium[tribune][sector].name, row: row, match: match});
  //      })
  //    }
  //  }
  //}
  return Promise.map(parameters, function ({tribune, sector, row, match}) {
    return createRowSeats(tribune, sector, row, match);
  }, {concurrency: 1}).then(function () {
    console.log("-----------------------/// add seats for match have done: ", match.id);
    return "done";
  });
}

function getRowSeats(seats) {
  return new Promise((resolve) => {
    let resultArray = [];
    if (seats.includes(',') || seats.includes('-')) {
      seats.split(',').map((interval) => {
        const intervalBoundaries = interval.split('-');
        const start = intervalBoundaries[0];
        const end = intervalBoundaries[1];
        resultArray.push(...Array(end - start + 1).fill(0).map((_, id) => parseInt(start) + parseInt(id)));
      });
    } else {
      resultArray = [...Array(parseInt(seats) + 1).keys()].filter(Boolean);
    }
    resolve(resultArray);
  });
}

function createRowSeats(tribuneName, sectorName, row, match) {
  return getRowSeats(row.seats)
    .then(seats => {
      let parameters = [];
      seats.forEach(seat => {
        parameters.push({tribune: tribuneName, sector: sectorName, row: row, seat: seat, match: match})
      });
      return Promise.map(parameters, function ({tribune, sector, row, seat, match}) {
        return createSeat(tribune, sector, row, seat, match);
      }, {concurrency: 1}).then(function () {
        console.log("-----------------------/// add row seats have done: sector - " + sectorName + ' ,row - ' + row.name);
        return "done";
      });
    });
}

function createSeat(tribuneName, sectorName, row, seat, match) {
  let slug = 's' + sectorName + 'r' + row.name + 'st' + seat;
  let newSeat = new Seat({
    slug: slug,
    match: match.id,
    tribune: tribuneName,
    sector: sectorName,
    row: row.name,
    seat: seat,
    reservedUntil: new Date(),
    reservedByCart: ''
  });

  return newSeat.save();
}

function removeSeatByMatchId(matchId) {
  return Seat.remove({match: matchId});
}

function seatExists(tribune, sector, row, seat) {
  const tribuneData = StadiumMetalist[`tribune_${tribune}`];
  const sectorData = tribuneData && tribuneData[`sector_${sector}`];
  const rowsData = sectorData && sectorData.rows;
  return rowsData && rowsData.find(({name, seats}) => name === row && seat <= seats);

}
