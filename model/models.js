sap.ui.define(
	['sap/ui/model/json/JSONModel', 'sap/ui/Device', '../util/themeHelper', '../util/languageHelper'],
	(JSONModel, Device, themeHelper, languageHelper) => {
		'use strict';

		return {

			// Device Model

			createDeviceModel() {
				const oModel = new JSONModel(Device);
				oModel.setDefaultBindingMode('OneWay');
				return oModel;
			},

			// Data Models

			createResumeModel() {
				const sLanguage = languageHelper.getSupportedLanguage();
				const sFilePath = `resource/data/Resume/resume-${sLanguage}.json`;
				const oModel = new JSONModel();
				oModel.setDefaultBindingMode('OneWay').loadData(sFilePath);
				return oModel;
			},

			createCalendarModel() {
				const oData = {
					Email: 'pavel@harelyshau.dev',
					Appointments: [],
					ExistingAppointments: []
				};
				return new JSONModel(oData);
			},

			createHanoiTowerModel() {
				const oData = {
					DiscCounts: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
					DiscCount: +localStorage.getItem('discs') || 3,
					Records: JSON.parse(localStorage.getItem('records')) ?? [],
					Moves: 0,
					Time: 0
				};
				return new JSONModel(oData);
			},

			createAlgorithmsModel(oArticleList) {
				const oModel = new JSONModel(oArticleList);
				oModel.setDefaultBindingMode('OneWay');
				return oModel;
			},

			// View Models

			createAppModel() {
				const sCurrentTheme = sap.ui.core.Configuration.getTheme();
				const oData = { theme: themeHelper.mapTheme(null, sCurrentTheme) };
				return new JSONModel(oData);
			},

			createCalendarViewModel() {
				const oData = {
					busy: true,
					fullDay: !!JSON.parse(localStorage.getItem('fullDay')),
					startHour: 8,
					endHour: 21,
					currentDate: new Date(),
					appointmentDuration: 3600000
				};
				return new JSONModel(oData);
			},

			createHanoiTowerViewModel() {
				const oData = {
					showMoveButtons: !!JSON.parse(localStorage.getItem('moveButtons'))
				};
				return new JSONModel(oData);
			},

			createAlgorithmsViewModel() {
				const oData = {
					sideExpanded: true
				};
				return new JSONModel(oData);
			}
		};
	}
);
