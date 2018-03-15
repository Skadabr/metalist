import {Component, EventEmitter, OnDestroy, OnInit} from '@angular/core';
import { TicketService } from '../services/ticket.service';
import {IntervalObservable} from 'rxjs/observable/IntervalObservable';
import 'rxjs/add/operator/takeWhile';
import {uniq} from 'lodash';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.less'],
})
export class TicketsComponent implements OnInit, OnDestroy {

  data: any = [];
  intervalExists = true;

  constructor(private ticketsService: TicketService) {
    // this.options = {
    //   barBackground: '#fcfcfc',
    //   gridBackground: '#f8f8f8',
    //   barBorderRadius: '10',
    //   barWidth: '6',
    //   gridWidth: '2'
    // };
  }
  // scrollChanged($event) {
  //   console.log($event);
  //   // this.slimScrollState = $event;
  // }
  ngOnInit() {
    this.getTickets();
    this.getPendingStatus();
    // this.play();
  }

  ngOnDestroy() {
    this.intervalExists = false;
  }

  getTickets() {
    this.ticketsService.getMyTickets()
      .subscribe(
        response => this.data = this.prepareTickets(response),
        err => console.log(err)
      );
  }

  getPendingStatus() {
    IntervalObservable.create(5000)
      .takeWhile(value => this.intervalExists && value < 5)
      .subscribe(
        (data) => {
          return this.ticketsService.getPendingStatus()
            .subscribe(
              ({status}) => {
                if (!status) {
                  this.intervalExists = false;
                  this.getTickets();
                }
              },
            );
        },
      );
  }

  prepareTickets(data) {
    console.log(66, data);
    const matchIds = uniq(data.map(({match: {id : {id}}}) => id));
    const tickets = matchIds.map(id => ({match: {_id: id}, tickets: []}));
    console.log(70, matchIds, tickets);
    data.forEach(({match, seat, ticketNumber}) => {
      const ticket = tickets.find(({match: {_id}}) => _id === match.id._id);
      ticket.match = match.id;
      ticket.tickets.push({...seat, ticketNumber});
    });
    return tickets;
  }

  print(ticketNumber) {
    window.open(`api/tickets/ticket/${ticketNumber}`, '_blank');
  }

}
