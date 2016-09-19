'use strict';

import mongoose from 'mongoose';
mongoose.Promise = require('bluebird');
import {Schema} from 'mongoose';
import {formatMoney} from '../../util';

var SeatSchema = new Schema({
    sector: {
        type: Number,
        required: true,
    },
    row: {
        type: Number,
        required: true,
    },
    number: {
        type: Number,
        required: true,
    },
    price: {
        type: Number,
        required: true
    }
});
SeatSchema
    .virtual('formattedPrice')
    .get(formatMoney)
;
SeatSchema.index({sector: 1, row: 1, number: 1}, {unique: true});

export default mongoose.model('Seat', SeatSchema);