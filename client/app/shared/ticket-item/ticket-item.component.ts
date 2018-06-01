import {Component, Input, Output, EventEmitter} from '@angular/core';
import {MatDialog} from '@angular/material';
import {TicketDialogComponent} from '../ticket-dialog/ticket-dialog.component';

@Component({
  selector: 'ticket-item',
  template: `
    <tr class="ticket-item-wrapper">
      <td width="5%" *ngIf="type" class="number">{{index}}</td>
      <td width="5%" *ngIf="type">
        <span class="indicator" [style.background]="type ==='tickets' ? '#00426b' : '#fc2c34'">&nbsp;</span>
      </td>
      <td class="text-container">
        <span [translate]="'stadium.'+ ticket.tribune" *ngIf="type"></span>
        <span *ngIf="type">,</span>
        <span [style.textTransform]="type ? 'lowercase' : 'capitalize'">сектор - {{ ticket.sector }},</span>
        <span>ряд - {{ ticket.row }},</span>
        <span *ngIf="type; else elsePlace">{{'common.place' | translate | lowercase}} - {{ticket.seat}},</span>
        <ng-template #elsePlace>
          <span>м. - {{ticket.seat}}</span>
        </ng-template>
        <span *ngIf="type">{{'common.price' | translate}} - {{ticket.price || ticket.amount}};</span>
        <span *ngIf="!type">- {{ticket.price}}грн;</span>
      </td>
      <td width="1%" class="symbol" style="cursor: pointer;">
        <div class="icon-container">
          <i *ngIf="type ==='tickets'; else elseBlock" class="fa fa-ticket" aria-hidden="true" (click)="openTicket()"></i>
          <ng-template #elseBlock>
            <i class="fa fa-times" aria-hidden="true" (click)="handleDelete()"></i>
          </ng-template>
        </div>
      </td>
    </tr>
  `,
  styleUrls: ['./ticket-item.component.less']
})

export class TicketItemComponent {
  @Input() ticket: any;
  @Input() type: string;
  @Input() index: number;
  @Output() onClick = new EventEmitter();

  constructor(private dialog: MatDialog) {
  }

  public handleDelete(): void {
    this.onClick.emit({
      slug: this.ticket.slug,
      sector: this.ticket.sector,
      row: this.ticket.row,
      seat: this.ticket.seat,
      matchId: this.ticket.match._id
    });
  }

  handlePrint() {
    this.onClick.emit({ticket: this.ticket});
  }

  public openTicket(): void {
    this.dialog.open(TicketDialogComponent, {
      data: this.ticket,
      maxWidth: '100vw'
    });
  }
}
