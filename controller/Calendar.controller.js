sap.ui.define([
	'./BaseController',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
	'../model/models',
	'../model/formatter',
	'../util/calendarManager'
], (BaseController, MessageToast, MessageBox, models, formatter, calendarManager) => {
	'use strict';

	return BaseController.extend('pharelyshau.controller.Calendar', {
		formatter,

		onInit() {
			this.removeCalendarViews();
			this.attachRoutesMatched();
			this.setModel(models.createCalendarModel());
			this.setModel(models.createCalendarViewModel.call(this), 'view');
			this.pCalendarAPI = this.initCalendarManager();
		},

		//////////////////////////////////
		//////////// ROUTING /////////////
		//////////////////////////////////

		attachRoutesMatched() {
			['Calendar', 'Appointment', 'NewAppointment'].forEach(sRoute => 
				this.attachRouteMatched(this[`on${sRoute}Matched`], sRoute)
			);
		},

		async onNewAppointmentMatched(oEvent) {
			this.onCalendarMatched(oEvent, true);
			await this.pCalendarAPI;
			const oQuery = oEvent.getParameter('arguments')['?query'] ?? {};
			const { title, agenda, start, end } = oQuery;
			const { StartDate, EndDate } = this.getDatesForNewAppointment(start, end);
			const oArgs = { Name: title, Description: agenda, StartDate, EndDate }
			this.createAppointment(oArgs);
			this.setCalendarStartDate(StartDate);
			this.openAppointmentDialog();
		},

		async onAppointmentMatched(oEvent) {
			this.onCalendarMatched(oEvent, true);
			await this.pCalendarAPI;
			const { appointment } = oEvent.getParameter('arguments');
			calendarManager.get(appointment).then(oAppointment => {
				if (!oAppointment?.Available) throw new Error;
				this.setEditableAppointment(oAppointment);
				this.setInitialAppointment(oAppointment);
				this.openAppointmentDialog();
				this.byId('calendar').setStartDate(oAppointment.StartDate);
			}).catch(() => this.navigateTo('Calendar'));
		},

		onCalendarMatched(oEvent, bKeepDialog) {
			!bKeepDialog && this.oAppointmentDialog?.close();
			const { view } = oEvent.getParameter('arguments');
			const oView = this.byId('calendar').getViewByKey(view);
			if (view && !oView) return this.navigateTo('Calendar');
			if (oView) this.byId('calendar').setSelectedView(oView);
		},

		//////////////////////////////////
		////// GOOGLE CALENDAR API ///////
		//////////////////////////////////

		async initCalendarManager() {
			await calendarManager.init();
			this.refreshCalendar();
			this.byId('btnMakeAppointment').setEnabled(true);
		},

		// Read Request Filtering
		getDateRange() {
			const oSelectedDate = this.byId('calendar').getStartDate();
			const oStartDate = new Date(oSelectedDate);
			const oEndDate = new Date(oSelectedDate);

			oStartDate.setDate(1);
			oStartDate.setHours(0, 0, 0);
			oStartDate.setMonth(oStartDate.getMonth() - 1);

			oEndDate.setHours(23, 59, 59);
			oEndDate.setMonth(oEndDate.getMonth() + 2);
			oEndDate.setDate(0);

			return [oStartDate, oEndDate];
		},

		//////////////////////////////////
		////////// JSON MODEL ////////////
		//////////////////////////////////

		setAppointments(aAppointments) {
			this.setProperty('/ExistingAppointments', aAppointments);
			this.refreshAppointments();
		},

		getExistingAppointments() {
			return this.getProperty('/ExistingAppointments');
		},

		refreshAppointments() {
			this.setAppointmentsWithEditable();
		},

		setAppointmentsWithEditable() {
			const aAppointments = [...this.getExistingAppointments()];
			this.addEditableAppointment(aAppointments);
			this.setProperty('/Appointments', aAppointments);
		},

		addEditableAppointment(aAppointments) {
			const oEditableAppointment = this.getEditableAppointment();
			if (!oEditableAppointment) return;
			const bAlreadyHas = aAppointments.some((oAppointment, i) => {
				const bEditable = oAppointment.ID === oEditableAppointment.ID;
				return bEditable && (aAppointments[i] = oEditableAppointment);
			});
			if (!bAlreadyHas) aAppointments.push(oEditableAppointment);
		},

		//////////////////////////////////
		//////////// CALENDAR ////////////
		//////////////////////////////////

		// Create by Button
		onPressOpenAppointmentDialog() {
			this.navigateTo('NewAppointment');
		},

		// Create by Drag & Drop
		onAppointmentCreateOpenDialog(oEvent) {
			const oStartDate = oEvent.getParameter('startDate');
			const sMsg = this.i18n('msgStartDateMustBeInFuture')
			if (!this.isDateInFuture(oStartDate)) return MessageToast.show(sMsg);
			const start = oStartDate.toISOString();
			const end = oEvent.getParameter('endDate').toISOString();
			const oParams = { '?query': { start, end }};
			this.navigateTo('NewAppointment', oParams);
		},

		// Open Popover
		onAppointmentSelectOpenPopover(oEvent) {
			const oControl = oEvent.getParameter('appointment');
			if (!oControl || oControl.getSelected()) return;
			const oAppointment = this.getObjectByControl(oControl);
			const sMsgBusy = this.i18n('msgBusyAtThisTime');
			if (!oAppointment.Available) return MessageToast.show(sMsgBusy);
			const sPath = this.getPathByControl(oControl);
			this.openPopover('AppointmentPopover', oControl, sPath);
		},

		// Resize & Drop
		onAppointmentResizeDrop(oEvent) {
			const { appointment } = oEvent.getParameters();
			const oAppointment = this.getObjectByControl(appointment);
			if (!oAppointment.Available || oAppointment.ID === 'new') return;
			this.setInitialAppointment(oAppointment);
			oAppointment.StartDate = oEvent.getParameter('startDate');
			oAppointment.EndDate = oEvent.getParameter('endDate');
			this.updateAppointmentGC(oAppointment);
		},

		onStartDateChangeCalendar() {
			this.refreshCalendar();
		},

		onMoreLinkPress(oEvent) {
			this.setCalendarDayView(oEvent);
		},

		onHeaderDateSelect(oEvent) {
			this.setCalendarDayView(oEvent);
		},

		onViewChange(oEvent) {
			const sViewId = oEvent.getSource().getSelectedView();
			const view = sViewId.replace(this.createId(''), '');
			this.navigateTo('Calendar', { view });
		},

		onPressToggleFullDay(oEvent) {
			const bPressed = oEvent.getSource().getProperty('pressed');
			this.setStorageItem('fullDay', bPressed);
		},

		setCalendarStartDate(oDate) {
			const oCalendar = this.byId('calendar');
			const oCalendarDate = oCalendar.getStartDate();
			if (this.areDatesInSameDay(oCalendarDate, oDate)) return;
			oCalendar.setStartDate(oDate);
			this.refreshCalendar();
		},

		setCalendarDayView(oEvent) {
			const oCalendar = this.byId('calendar');
			oCalendar.setStartDate(oEvent.getParameter('date'));
			oCalendar.setSelectedView(oCalendar.getViews()[0]); // DayView
		},

		async refreshCalendar() {
			this.setBusy(true);
			const aDates = this.getDateRange();
			try {
				const aAppointments = await calendarManager.list(...aDates);
				this.setAppointments(aAppointments);
			} catch {
				MessageBox.error(this.i18n('msgErrorFetchingAppointments'));
			}	
			this.setBusy(false);
		},

		removeCalendarViews() {
			const { system, resize } = this.getModel('device').getData();
			const bSmallScreen = system.phone || resize.width <= 800;
			const oCalendar = this.byId('calendar');
			(bSmallScreen ? ['week'] : ['two-days', 'three-days'])
				.forEach(sKey => oCalendar.removeView(oCalendar.getViewByKey(sKey)));
		},

		//////////////////////////////////
		///////////// DIALOG /////////////
		//////////////////////////////////

		openAppointmentDialog() {
			this.openDialog('AppointmentDialog', '/EditableAppointment');
		},

		// Save Button
		async onPressCreateEditAppointment(oEvent) {
			if (!this.validateEmailInput()) return;
			const oAppointment = this.getObjectByEvent(oEvent);
			this.setStorageItem('email', oAppointment.Email);
			if (oAppointment.ID === 'new') this.createAppointmentGC(oAppointment);
			else this.updateAppointmentGC(oAppointment);
			this.oAppointmentDialog.close();
		},

		async createAppointmentGC(oAppointment) {
			this.getProperty('/ExistingAppointments').push(oAppointment);
			try {
				oAppointment = await calendarManager.create(oAppointment);
				MessageToast.show(this.i18n('msgAppointmentWasCreated'));
				this.refreshAppointment(oAppointment);
			} catch {
				MessageBox.error(this.i18n('msgErrorCreatingAppointment'));
				this.removeAppointment(oAppointment);
			}
		},

		async updateAppointmentGC(oAppointment) {
			const oInitialAppointment = this.getInitialAppointment();
			const bNoChanges = JSON.stringify(oInitialAppointment) === JSON.stringify(oAppointment);
			if (bNoChanges) return MessageToast.show(this.i18n('msgNoChanges'));
			this.setInitialAppointment(oAppointment);
			try {
				oAppointment = await calendarManager.update(oAppointment);
				MessageToast.show(this.i18n('msgAppointmentWasUpdated'));
			} catch {
				MessageBox.error(this.i18n('msgErrorUpdatingAppointment'));
				this.setInitialAppointment(oInitialAppointment);
				oAppointment = oInitialAppointment;
			}
			this.refreshAppointment(oAppointment);
		},

		// Google Meet
		onPressAddGoogleMeet(oEvent) {
			const sPath = `${this.getPathByEvent(oEvent)}/GoogleMeet`;
			const sGoogleMeet = this.getInitialAppointment()?.GoogleMeet;
			this.setProperty(sPath, sGoogleMeet ?? 'willBeCreated');
		},

		onPressRemoveGoogleMeet(oEvent) {
			const sPath = `${this.getPathByEvent(oEvent)}/GoogleMeet`;
			this.setProperty(sPath, null);
		},

		// Pickers
		onChangePicker(oEvent, sField) {
			const oPicker = oEvent.getSource();
			const oAppointment = this.getObjectByEvent(oEvent);

			const bValueValid = oEvent.getParameter('valid') && !!oEvent.getParameter('value');
			if (!bValueValid) {
				// if wrong input reset value
				this.resetPickerValue(oPicker, oAppointment[sField]);
				return;
			}

			const oNewDate = oPicker.getDateValue();
			if (sField === 'StartDate') {
				this.updateAppointmentEndDateByDuration(oNewDate, oAppointment);
				this.setCalendarStartDate(oNewDate);
			}
			oAppointment[sField] = oNewDate;
			this.refreshModel();
		},

		onBeforeCloseAppointmentDialog(oEvent) {
			const oAppointment = this.getObjectByEvent(oEvent);
			if (oAppointment.ID !== 'new') this.resetEditableAppointment();
			this.setEditableAppointment(null);
			this.refreshAppointments();
			this.navigateTo('Calendar');
		},

		//////////////////////////////////
		///////////// POPOVER ////////////
		//////////////////////////////////

		// Edit Button
		onPressEditOpenAppointmentDialog(oEvent) {
			this.oAppointmentPopover.close();
			const { ID: appointment } = this.getObjectByEvent(oEvent);
			this.navigateTo('Appointment', { appointment });
		},

		// Remove Button
		async onPressRemoveAppointment(oEvent) {
			this.oAppointmentPopover.close();
			const oAppointment = this.getObjectByEvent(oEvent);
			this.removeAppointmentGC(oAppointment);
		},

		async removeAppointmentGC(oAppointment) {
			this.removeAppointment(oAppointment);
			try {
				await calendarManager.remove(oAppointment.ID);
				MessageToast.show(this.i18n('msgAppointmentWasRemoved'));
			} catch {
				MessageBox.error(this.i18n('msgErrorRemovingAppointment'));
				this.getProperty('/ExistingAppointments').push(oAppointment);
				this.refreshAppointment(oAppointment);
			}
		},

		// Copy Conference
		onPressCopyConferenceLink(oEvent) {
			const { GoogleMeet, Conference } = this.getObjectByEvent(oEvent);
			this.copyToClipboard(GoogleMeet ?? Conference);
		},

		// Join to Conference
		onPressJoinToConference(oEvent) {
			const { GoogleMeet, Conference } = this.getObjectByEvent(oEvent);
			this.openLink(GoogleMeet ?? Conference, true);
		},

		//////////////////////////////////
		///////////// INPUTS /////////////
		//////////////////////////////////

		// Inputs
		validateEmailInput() {
			const oEmailInput = this.byId('inpEmail');
			if (this.isInputFilledAndValid(oEmailInput)) return true;
			const bEmpty = !oEmailInput.getValue();
			if (bEmpty) this.resetInputValue(oEmailInput);
			MessageToast.show(this.i18n(bEmpty ? 'msgFillEmail' : 'msgInvalidEmail'));
			return false;
		},

		resetInputValue(oInput) {
			oInput.setValue('s');
			oInput.setValue('');
		},

		// Pickers
		resetPickerValue(oPicker, oDate) {
			oPicker.setValue('');
			oPicker.setDateValue(oDate);
		},

		//////////////////////////////////
		///////////// DATES //////////////
		//////////////////////////////////

		getDatesForNewAppointment(sStartDate, sEndDate) {
			const oArgStartDate = new Date(sStartDate);
			const oArgEndDate = new Date(sEndDate);
			const oCalendarDate = this.byId('calendar').getStartDate();
			const iDuration = this.getProperty('/appointmentDuration', 'view');
			const StartDate = this.isValidDate(oArgStartDate)
				? oArgStartDate
				: this.roundUpDateTo15Min(
					this.isDateInFuture(oCalendarDate) ? oCalendarDate : new Date()
				);
			const EndDate = this.isValidDate(oArgEndDate) && oArgEndDate > StartDate
				? oArgEndDate
				: new Date(StartDate.getTime() + iDuration);
			return { StartDate, EndDate };
		},

		roundUpDateTo15Min(oDate) {
			const iRemainder = oDate.getMinutes() % 15;
			return new Date(oDate.getTime() + (15 - iRemainder) * 60000);
		},

		isValidDate: (oDate) => oDate instanceof Date && !isNaN(oDate),

		isDateInFuture: (oDate) => new Date() < oDate,

		areDatesInSameDay(oDate1, oDate2) {
			const iTime1 = new Date(oDate1).setHours(0, 0, 0, 0);
			const iTime2 = new Date(oDate2).setHours(0, 0, 0, 0);
			return iTime1 === iTime2;
		},

		//////////////////////////////////
		////////// APPOINTMENT ///////////
		//////////////////////////////////

		// Refresh
		refreshAppointment(oUpdatedAppointment) {
			const aAppointments = this.getExistingAppointments();
			for (let i = aAppointments.length - 1; i >= 0; i--) {
				const bThis = aAppointments[i].ID === oUpdatedAppointment.ID;
				if (bThis || aAppointments[i].ID === 'new') {
					aAppointments[i] = oUpdatedAppointment;
					break;
				}
			}
			this.refreshAppointments();
		},

		// Create
		createAppointment(oParams) {
			const oAppointment = {
				ID: 'new',
				Email: this.getStorageItem('email'),
				Mode: 'create',
				Available: true,
				GoogleMeet: 'willBeCreated',
				...oParams
			};
			this.setEditableAppointment(oAppointment);
			this.refreshAppointments();
			return oAppointment;
		},

		// Remove
		removeAppointment(oAppointment) {
			const aAppointments = this.getProperty('/ExistingAppointments');
			aAppointments.splice(aAppointments.indexOf(oAppointment), 1); // remove by index
			this.refreshAppointments();
		},

		// Reset
		resetEditableAppointment() {
			const sID = this.getEditableAppointment().ID;
			const aAppointments = this.getExistingAppointments();
			const oAppointment = aAppointments.find(({ ID }) => ID === sID);
			const oInitialAppointment = this.getInitialAppointment();
			Object.keys(oAppointment ?? {}).forEach((sKey) => {
				oAppointment[sKey] = oInitialAppointment[sKey];
			});
		},

		// Update End Date
		updateAppointmentEndDateByDuration(oNewStartDate, oAppointment) {
			const iDuration = oAppointment.EndDate - oAppointment.StartDate;
			oAppointment.EndDate = new Date(oNewStartDate.getTime() + iDuration);
		},

		// Get Editable
		getEditableAppointment() {
			return this.getProperty('/EditableAppointment');
		},

		setEditableAppointment(oAppointment) {
			this.setProperty('/EditableAppointment', oAppointment);
		},

		// Get Initial
		getInitialAppointment() {
			return this.getProperty('/InitialAppointment');
		},

		setInitialAppointment(oAppointment) {
			this.setProperty('/InitialAppointment', { ...oAppointment });
		}

	});
});
