'use strict';

import * as matchService from './match.service';
import * as seatService from '../seat/seat.service';
import * as log4js from 'log4js';

let logger = log4js.getLogger('Match');

export function getNextMatches(req, res) {
  return matchService.getNextMatches()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function getPrevMatches(req, res) {
  return matchService.getPrevMatches()
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function getMatchById(req, res) {
  return matchService.findById(req.params.id)
    .then(handleEntityNotFound(res))
    .then(respondWithResult(res))
    .catch(handleError(res));
}

export function createMatch(req, res) {
  console.log('createMatch req.body', req.body);
  let newMatch = req.body,
    matchDate = newMatch.date;

  return matchService.createMatch(newMatch)
    .then(match => {
      seatService.createSeatsForMatch(match)
        .then(() => {
          match.date = matchDate;

          return match.save();
        });
      return match;
    })
    .then(respondWithResult(res))
    .catch(handleError(res))
}


export function deleteMatch(req, res) {
  let matchId = req.params.id;

  return Promise.all([
    matchService.removeById(matchId),
    seatService.getByMatchId(matchId)
  ])
    .then(([match, seats]) => {
      if (seats.length) {
        seatService.deletePrevMatchSeats(seats, matchId);
      }
      return match;
    })
    .then(() => {
      res.status(204).end();
    })
    .catch(handleError(res));
}

export function updateMatch(req, res) {
  let modifiedMatch = req.body;

  return matchService.findById(req.params.id)
    .then(handleEntityNotFound(res))
    .then(match => {
      if (match) {
        return matchService.updateMatch(match, modifiedMatch);
      }
    })
    .then(respondWithResult(res))
    .catch(handleError(res))
    ;
}

//private functions

function respondWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function (entity) {
    if (entity) {
      logger.info('respondWithResult ' + entity._id);
      return res.status(statusCode).json(entity);
    }
  };
}

function handleEntityNotFound(res) {
  return function (entity) {
    if (!entity) {
      res.status(404).end();
      return null;
    }
    return entity;
  };
}

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function (err) {
    logger.error('handleError ' + err);
    res.status(statusCode).send(err);
  };
}
