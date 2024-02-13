sap.ui.define([
	'sap/ui/model/json/JSONModel',
	'sap/ui/Device',
	'../util/themeHelper',
	'../util/languageHelper'
], (JSONModel, Device, themeHelper, languageHelper) => {
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
			const sLanguage = languageHelper.getLanguage();
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
				DiscCounts: Array.from({ length: 18 }, (_, i) => i + 3),
				DiscCount: +localStorage.getItem('discs') || 5,
				Records: JSON.parse(localStorage.getItem('records')) ?? [],
				Moves: 0,
				Time: 0
			};
			return new JSONModel(oData);
		},

		createMinesweeperModel() {
			const [iCustomW, iCustomH, iCustomMines] = ['Width', 'Height', 'Mines']
				.map(sProperty => +localStorage.getItem('custom' + sProperty));
			const oCustomLevel = {
				Key: 'custom',
				Width: iCustomW || 30,
				Height: iCustomH || 60,
				Mines: iCustomMines || 150
			};
			const Levels = [
				{ Key: 'easy', Width: 9, Height: 9, Mines: 10 },
				{ Key: 'medium', Width: 16, Height: 16, Mines: 40},
				{ Key: 'hard', Width: 30, Height: 16, Mines: 99},
				oCustomLevel
			];
			const Level = Levels.find(oLevel => oLevel.Key === Levels[0].Key);
			const Records = JSON.parse(localStorage.getItem('minesweeperRecords')) ?? [];
			const oData = { Levels, Level, Time: 0, Records };
			return new JSONModel(oData);
		},

		createTicTacToeModel() {
			const levels = ['Easy', 'Medium', 'Friend'];
			const oData = { levels, level: levels[1] };
			return new JSONModel(oData);
		},

		createAlgorithmsModel(oArticleList) {
			const oModel = new JSONModel(oArticleList);
			return oModel.setDefaultBindingMode('OneWay');
		},

		createSandboxModel() {
			const files = [
				{
					name: 'HTML',
					value: `<h1>Some title</h1>`
				},
				{
					name: 'JavaScript',
					value: 'console.log(3333)'
				},
				{
					name: 'CSS',
					value: 'body { background: red }'
				}
			];
			const oData = {
				files,
				selectedFile: files[0]
			};
			return new JSONModel(oData);
		},

		// View Models

		createAppModel() {
			const oData = { theme: themeHelper.getTheme() };
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

		createMinesweeperViewModel() {
			return new JSONModel();
		},

		createAlgorithmsViewModel() {
			const oData = {
				sideExpanded: true
			};
			return new JSONModel(oData);
		}
	};
});
