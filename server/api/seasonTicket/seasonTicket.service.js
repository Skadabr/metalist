'use strict';

import {SEASON_TICKET, BLOCK, RESERVE} from '../seat/seat.constants';
import Promise from 'bluebird';
import {Stadium} from '../../stadium';
import SeasonTicket from './seasonTicket.model';
import {randomNumericString} from "../ticket/ticket.service";
import moment from "moment/moment";

export function getActiveSeasonTickets() {
  return SeasonTicket.find({reservedUntil: {$gte: new Date()}, reservationType: SEASON_TICKET}).sort({reservedUntil: 'desc'});
}

export function getSeasonTicketsByIds(seasonTicketsIds) {
  return SeasonTicket.find({'_id': {$in: seasonTicketsIds}});
}

export function getSeasonTicketById(seasonTicketId) {
  return SeasonTicket.findOne({'_id': seasonTicketId});
}

export function getActiveBlockTickets() {
  return SeasonTicket.find({reservedUntil: {$gte: new Date()}, reservationType: BLOCK});
}

export function getActiveBlocksBySector(sector) {
  return SeasonTicket.find({reservedUntil: {$gte: new Date()}, sector: sector});
}

export function findBySlug(slug) {
  return SeasonTicket.findOne({slug: slug});
}

export function removeBySlug(slug) {
  return SeasonTicket.remove({slug: slug});
}

export function createSeasonTicket(seat, reservedUntil = moment().add(2, 'y')) {
  const newTicket = new SeasonTicket({
    slug: seat.slug,
    sector: seat.sector,
    row: seat.row,
    seat: seat.seat,
    tribune: seat.tribune,
    reservedUntil: reservedUntil,
    reservationType: SEASON_TICKET,
    accessCode: randomNumericString(16),
    status: RESERVE
  });

  return newTicket.save();
}

export function getBlockedRowSeats(sector, row) {
  return SeasonTicket.find({sector: sector, row: row, reservedUntil: {$gte: new Date()}});
}

export function getRowSeats(sectorName, rowName) {
  return new Promise((resolve, reject) => {
    let tribuneName = getTribuneName(sectorName),
      [stadiumRow] = Stadium['tribune_' + tribuneName]['sector_' + sectorName].rows.filter(row => row.name === rowName),
      stadiumSeats = [...Array(parseInt(stadiumRow.seats) + 1).keys()].filter(Boolean);

    if (stadiumSeats.length) {
      resolve(stadiumSeats);
    } else {
      reject(new Error('stadiumSeats not found.'));
    }
  });
}

export function createBlockRow(seats, blockRow) {
  return Promise.all(
    seats.map(seat => {
      return createBlockRowTicket(seat, blockRow);
    })
  );
}

export function removeBlockRow(tickets) {
  return Promise.all(
    tickets.map(ticket => {
      return removeBySlug(ticket.slug);
    })
  );
}

export function getBlockRow(sector, row) {
  return SeasonTicket.find({sector: sector, row: row, reservationType: BLOCK});
}

////// private function
function getTribuneName(sectorName) {
  let tribuneName, tribune;

  for (tribune in Stadium) {
    if (Stadium[tribune]['sector_' + sectorName]) {
      tribuneName = Stadium[tribune].name;
    }
  }
  return tribuneName;
}

function createBlockRowTicket(seat, blockRow) {
  let slug = 's' + blockRow.sector + 'r' + blockRow.row + 'st' + seat;

  let newTicket = new SeasonTicket({
    slug: slug,
    sector: blockRow.sector,
    row: blockRow.row,
    seat: seat,
    reservedUntil: blockRow.reservedUntil,
    reservationType: BLOCK
  });

  return newTicket.save();
}
