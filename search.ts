import { NavigationType } from './../utils';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Auth } from './../model/auth';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { UsersService } from '../services/users.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ToastrService } from 'ngx-toastr';

import { Utils } from '../utils';
import { RechargeService } from '../services/recharge.service';
import { Router } from '@angular/router';

import * as stateDistData from '../model/state-dist.json';

@Component({
    selector: 'app-users',
    templateUrl: './users.component.html',
    styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {

    title = 'Manage User';
    users = [];
    userToShow: any;
    modalRef: BsModalRef;
    pageList = [];
    totalNumberOfPages: number;
    stateDistrict = [];

    selectedCreateCityList = []; // this list is updated when the state list is changed in create user form
    selectedSearchCityList = []; // this list is updated when the state list is changed in search 
    selectedParentBusinessUserId = null;

    searchAttributes = {
        userId: null,
        name: null,
        state: '',
        city: null,
        parentBusinessUserId: null,
        userType: null,
        statusCode: null,
        balanceMin: null,
        balanceMax: null
    }

    defaultSate = 'West Bengal';
    defaultCity = 'Kolkata';
    userFormAttributes = {
        city: null,
        state: null,
        userType: null,
        name: null,
        userId: null,
        statusCode: null,
        businessUserId: null,
        comissionPercentage: 3,

        showBusinessUserTextbox: true,
        errorList: [],
        submitDisabled: false,
        editMode: false
    }


    // these two variable holds the user table state and used 
    // when the user table is updated after edit or create
    currentNavigationType: NavigationType;
    currentPageNumber: number;

    userIdToDelete: string;

    constructor(
        private userService: UsersService,
        private modalService: BsModalService,
        public utils: Utils,
        private toastr: ToastrService,
        private rechargeService: RechargeService,
        private router: Router,
        public auth: Auth,
        private http: HttpClient
    ) { }

    ngOnInit() {
        this.getUsers();

        this.resetUserFormAttributes();
        this.resetSearchAttribute();
    }

    ngOnDestroy() {
        if(this.modalRef) this.modalRef.hide();
    }



    getUsers(navigationType = NavigationType.ALL, pageNumber = 0) {
        this.currentNavigationType = navigationType;
        this.currentPageNumber = pageNumber;
        console.log(`Getting users - navigationType = ${navigationType} and pageNumber = ${pageNumber}`);

        const requestParams = {
            params: this.constructParam(navigationType, pageNumber)
        }

        this.http.get(this.utils.urls.usersUrl, requestParams).subscribe((data: any) => {
            this.users = data.users;
            this.totalNumberOfPages = data.meta.TotalNumberOfPages;
            let pages = this.utils.protectKing(data.meta.PageNumber, data.meta.TotalNumberOfPages, 2);
            this.pageList = []; // empty the array before inserting the data
            pages.forEach(p => {
                this.pageList.push({
                    pageNumber: p,
                    active: p === data.meta.PageNumber ? true : false
                });
            })

        }, (error: any) => {
            this.toastr.error(`Error in getting user ${error}`, this.title)
        });
    }

    viewPlayersOfBusinessUser(userId: string) {
        this.resetSearchAttribute();
        this.searchAttributes.parentBusinessUserId = userId;
        this.searchAttributes.userType = 'PLAYER';
        this.getUsers(NavigationType.SEARCH);
    }

    submitCreateUser() {
        this.validateUserFormSubmit();

        if (this.userFormAttributes.errorList.length === 0) {
            const newUser: any = {
                UserId: this.userFormAttributes.userId,
                Name: this.userFormAttributes.name,
                State: this.userFormAttributes.state,
                City: this.userFormAttributes.city,
                UserType: this.userFormAttributes.userType
            }

            if (this.userFormAttributes.userType === 'PLAYER') {
                newUser.ParentBusinessUserId = this.userFormAttributes.businessUserId;
            }

            if (this.userFormAttributes.userType === 'BUSINESS') {
                newUser.ComissionPercentage = this.userFormAttributes.comissionPercentage;
            }

            this.http.post(this.utils.urls.usersUrl, newUser).subscribe((data: any) => {
                this.toastr.info(`New User Created`, this.title);
                this.resetUserFormAttributes();
                this.modalRef.hide();
                this.getUsers(this.currentNavigationType, this.currentPageNumber);
            }, (error: any) => {
                this.toastr.error(`Error in creating user - ${error}`, this.title)
            })
        }
    }

    submitUpdateUser(skipValidation = false) {
        if (!skipValidation) this.validateUserFormSubmit();

        if (this.userFormAttributes.errorList.length === 0) {
            const updatedUser: any = {
                UserId: this.userFormAttributes.userId,
                Name: this.userFormAttributes.name,
                State: this.userFormAttributes.state,
                City: this.userFormAttributes.city,
                UserType: this.userFormAttributes.userType,
                StatusCode: this.userFormAttributes.statusCode
            }

            if (this.userFormAttributes.userType === 'BUSINESS') {
                updatedUser.ComissionPercentage = this.userFormAttributes.comissionPercentage;
            }

            this.http.put(`${this.utils.urls.usersUrl}/${this.userFormAttributes.userId}`, updatedUser).subscribe((data: any) => {
                this.toastr.info(`User Updated`, this.title);
                this.resetUserFormAttributes();
                if (this.modalRef) this.modalRef.hide();
                this.getUsers(this.currentNavigationType, this.currentPageNumber);
            }, (error: any) => {
                this.toastr.error(`Error in updating user - ${error}`, this.title)
            })
        }
    }

    submitDeleteUser() {
        this.http.delete(`${this.utils.urls.usersUrl}/${this.userIdToDelete}`).subscribe((data: any) => {
            this.toastr.info(`User Deleted`, this.title);
            this.getUsers(this.currentNavigationType, this.currentPageNumber);
            this.declineDeleteUser();
        }, (error: any) => {
            this.toastr.error(`Error in deleting user - ${error}`, this.title)
            this.declineDeleteUser();
        })
    }

    declineDeleteUser() {
        this.userIdToDelete = null;
        this.modalRef.hide();
    }

    blockUser(userId: string) {
        this.userFormAttributes.userId = userId;
        this.userFormAttributes.statusCode = 'BLOCKED';
        this.submitUpdateUser(true);
    }

    activateUser(userId: string) {
        this.userFormAttributes.userId = userId;
        this.userFormAttributes.statusCode = 'ACTIVE';
        this.submitUpdateUser(true);
    }

    reseetUser(userId: string) {
        this.userFormAttributes.userId = userId;
        this.userFormAttributes.statusCode = 'REGISTERED';
        this.submitUpdateUser(true);
    }

    // kept as example for namgaion
    viewRecharge(userId: string) {
        this.router.navigate([`users/${userId}/recharges`]);
    }

    // Modal Events - START

    openCreateBuinessModal(template: TemplateRef<any>) {
        this.resetUserFormAttributes();
        this.modalRef = this.modalService.show(template);
    }

    openCreatePlayerModal(template: TemplateRef<any>, businessUserId: string) {

        let selectedUser = this.getUserObject(businessUserId);

        this.userTypeChanged('PLAYER');
        this.userFormAttributes.businessUserId = businessUserId;
        this.userFormAttributes.userType = 'PLAYER';
        this.userFormAttributes.state = selectedUser.State;
        this.updateCity(selectedUser.State, 'C');
        this.userFormAttributes.city = selectedUser.City;

        this.modalRef = this.modalService.show(template);
    }

    openEditUserModel(template: TemplateRef<any>, userId: string) {
        this.resetUserFormAttributes();
        const selectedUser = this.getUserObject(userId);

        this.userFormAttributes.state = selectedUser.State;
        this.updateCity(selectedUser.State, 'C');
        this.userFormAttributes.city = selectedUser.City;
        this.userFormAttributes.userType = selectedUser.UserType;
        this.userTypeChanged(selectedUser.UserType);
        this.userFormAttributes.name = selectedUser.Name;
        this.userFormAttributes.userId = selectedUser.UserId;
        this.userFormAttributes.comissionPercentage = selectedUser.ComissionPercentage;
        this.userFormAttributes.businessUserId = selectedUser.ParentBusinessUserId;
        this.userFormAttributes.editMode = true;
        this.modalRef = this.modalService.show(template);
    }

    openDeleteUserModel(template: TemplateRef<any>, userId: string) {
        this.userIdToDelete = userId;
        this.modalRef = this.modalService.show(template);
    }
    // Modal Events - END

    // utility function - START
    private constructParam(navigationType: NavigationType, pageNumber = 0): any {
        let params: any = {};
        let requestPageNumber = 1;
        const currentPage = this.currentPage;

        if (pageNumber === 0 && currentPage !== 0) {
            requestPageNumber = currentPage;
        }

        if (navigationType === NavigationType.NEXT) {
            requestPageNumber = currentPage + 1;
        }

        if (navigationType === NavigationType.PREVIOUS) {
            requestPageNumber = currentPage - 1;
        }

        if (navigationType === NavigationType.PAGE) {
            requestPageNumber = pageNumber
        }

        // setting pageNumber
        params.PageNumber = requestPageNumber;
        params.PageSize = this.utils.defaultPageSize;

        if (navigationType === NavigationType.ALL) {
            this.resetSearchAttribute();
            return params;
        }

        if (navigationType === NavigationType.SEARCH) {
            params.PageNumber = 1;
        }

        // setting search params
        if (this.searchAttributes.name) params.Name = this.searchAttributes.name;
        if (this.searchAttributes.userId) params.UserId = this.searchAttributes.userId;
        if (this.searchAttributes.state !== '') params.State = this.searchAttributes.state;
        if (this.searchAttributes.city !== '') params.City = this.searchAttributes.city;
        if (this.searchAttributes.userType !== '') params.UserType = this.searchAttributes.userType;

        if (this.searchAttributes.statusCode !== '') params.StatusCode = this.searchAttributes.statusCode;
        if (this.searchAttributes.balanceMin) params.BalanceAmountMin = this.searchAttributes.balanceMin;
        if (this.searchAttributes.balanceMax) params.BalanceAmountMax = this.searchAttributes.balanceMax;

        if (this.searchAttributes.parentBusinessUserId) params.ParentBusinessUserId = this.searchAttributes.parentBusinessUserId;

        return params;

    }

    private getUserObject(userId: string) {
        let selectedUser = null;
        this.users.forEach(u => {
            if (u.UserId === userId) {
                selectedUser = u;
            }
        });

        return selectedUser;
    }

    private get currentPage(): number {
        let currentPage = 0;
        this.pageList.forEach(p => {
            if (p.active) currentPage = p.pageNumber
        });

        return currentPage;
    }

    get NavigationType() { return NavigationType }

    private resetUserFormAttributes() {
        this.userFormAttributes = {
            city: this.defaultCity,
            state: this.defaultSate,
            userType: 'BUSINESS',
            name: null,
            userId: null,
            businessUserId: null,
            statusCode: null,
            comissionPercentage: 3,
            showBusinessUserTextbox: false,
            errorList: [],
            submitDisabled: false,
            editMode: false
        }

        stateDistData.states.forEach(s => {
            this.stateDistrict.push(s);
            if (s.state === this.defaultSate) {
                this.selectedCreateCityList = s.districts;
            }
        });
    }

    private resetSearchAttribute() {
        this.searchAttributes = {
            userId: null,
            name: null,
            state: '',
            city: '',
            parentBusinessUserId: '',
            userType: '',
            statusCode: '',
            balanceMin: null,
            balanceMax: null
        }
    }

    get randomColor() {
        return 'hsla(' + Math.floor(Math.random()*360) + ', 100%, 70%, 1)';
    }

    // utility function - END

    // UI Manipulation - START

    updateCity(selectedState: string, whereUsed: string) {
        this.stateDistrict.forEach(s => {
            if (s.state === selectedState) {
                if (whereUsed === 'C') {
                    this.selectedCreateCityList = s.districts;
                } else if (whereUsed === 'S') {
                    this.selectedSearchCityList = s.districts;
                }
            }
        })
    }

    userTypeChanged(selectedUserType: string) {
        if (selectedUserType === 'PLAYER') {
            this.userFormAttributes.showBusinessUserTextbox = true;
        } else {
            this.userFormAttributes.showBusinessUserTextbox = false;
        }
        this.userFormAttributes.businessUserId = null;
    }

    validateUserFormSubmit() {
        this.userFormAttributes.errorList = [];
        if (!this.userFormAttributes.state) this.userFormAttributes.errorList.push('Please select state');
        if (!this.userFormAttributes.city) this.userFormAttributes.errorList.push('Please select city');
        if (!this.userFormAttributes.userType) this.userFormAttributes.errorList.push('Please select user type');
        if (!this.userFormAttributes.name) this.userFormAttributes.errorList.push('Please enter name');
        if (!this.userFormAttributes.userId) this.userFormAttributes.errorList.push('Please enter user id');
        else if (!this.utils.phoneNumberRegex.test(this.userFormAttributes.userId)) this.userFormAttributes.errorList.push('User Id should be 10 digit phone number');


        if (this.userFormAttributes.userType === 'PLAYER') {
            if (!this.userFormAttributes.businessUserId) this.userFormAttributes.errorList.push('Please enter business user id');
            else if (!this.utils.phoneNumberRegex.test(this.userFormAttributes.businessUserId)) this.userFormAttributes.errorList.push('Business User Id should be 10 digit phone number');
        }

        if (this.userFormAttributes.userType === 'BUSINESS') {
            if (!this.userFormAttributes.comissionPercentage) this.userFormAttributes.errorList.push('Please enter comission percentage');
        }
    }
    // UI Manipulation - END
}
