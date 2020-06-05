public protectKing(king: number, maxRuk: number, median: number) {
    const army = [];
    const minRuk = 1;
    const armySize = (median * 2) + 1;
    let start = king - median < minRuk ? 1 : king - median;
    let end = king + median > maxRuk ? maxRuk : king + median;

    // console.log(`Start = ${start} , End = ${end}`);
    let missingRuk = armySize - (end - start + 1);
    // console.log(`Missing Ruk = ${missingRuk}`);
    end = end + missingRuk > maxRuk ? maxRuk : end + missingRuk;
    start = start - missingRuk <= minRuk ? minRuk : start - minRuk;


    for (let i = start; i <= end; i++) {
        army.push(i);
    }
    return army;
}

let pages = this.utils.protectKing(data.meta.PageNumber, data.meta.TotalNumberOfPages, 2);

<ul class="pagination" *ngIf="pageList.length > 0">
                <li class="page-item" [ngClass]="currentPage === 1 ? 'disabled' : ''">
                    <a class="page-link" (click)="getUsers(NavigationType.PREVIOUS)">Previous</a>
                </li>
                <li class="page-item" *ngFor="let page of pageList" [ngClass]="{'active': page.active}">
                    <a class="page-link" (click)="getUsers(NavigationType.PAGE, page.pageNumber)">
                        {{page.pageNumber}} <span class="sr-only" *ngIf="page.active">(current)</span>
                    </a>
                </li>
                <li class="page-item" [ngClass]="currentPage === totalNumberOfPages ? 'disabled' : ''">
                    <a class="page-link" (click)="getUsers(NavigationType.NEXT)">Next</a>
                </li>
            </ul>