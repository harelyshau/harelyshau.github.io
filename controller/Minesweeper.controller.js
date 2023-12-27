sap.ui.define([
    './BaseController',
    'sap/m/MessageToast',
    '../model/models',
    '../model/formatter',
], (BaseController, MessageToast, models, formatter) => {
    'use strict';

    return BaseController.extend('pharelyshau.controller.Minesweeper', {
        formatter,

        onInit() {
            this.setModel(models.createMinesweeperModel());
            this.setModel(models.createMinesweeperViewModel(), 'view');
            this.setupGame();
            this.attachTimer();
        },

        //////////////////////////////////
        /////////// SETUP GAME ///////////
        //////////////////////////////////

        setupGame() {
            this.setProperty('/GameFinished', false);
            this.createField();
            this.resetStartupParams();
            this.stopTimer();
            this.setGameWidth(300);
        },

        setGameWidth(iDelay) {
            setTimeout(() => {
                const oCellButton = this.byId('gameBox').getItems()[0].getItems()[0];
                const oHtmlButton = oCellButton.getDomRef();
                if (!oHtmlButton) return this.setGameWidth();
                const { Width } = this.getCurrentLevel();
                const iWidth = oHtmlButton.offsetWidth * Width;
                this.setProperty('/fullWidth', iWidth > 700, 'view');
            }, iDelay);
        },

        resetStartupParams() {
            const { Mines, Width, Height } = this.getCurrentLevel();
            this.setProperty('/CellsLeft', Width * Height - Mines);
            this.setProperty('/Flags', Mines);
            this.setProperty('/Time', 0);
        },

        createField() {
            const { Width, Height } = this.getCurrentLevel();
            const aField = Array.from(
                { length: Height },
                (_, x) => Array.from(
                    { length: Width },
                    (_, y) => ({ ID: x * Width + y, Coordinates: [x, y] })
                )
            );
            this.setProperty('/Field', aField);
        },

        insertMines(iCurrentID) {
            if (this.isAlreadyMined()) return;
            const { Width, Height, Mines } = this.getCurrentLevel();
            const aMineIndecies = [...Array(Width * Height).keys()]
                .filter(i => i !== iCurrentID)
                .sort(() => Math.random() - 0.5)
                .slice(0, Mines);
            const aCells = this.getCells();
            aCells.forEach(oCell => oCell.IsMine = aMineIndecies.includes(oCell.ID));
        },

        isAlreadyMined() {
            const aField = this.getField();
            const oCell = aField[0][0];
            return 'IsMine' in oCell;
        },

        //////////////////////////////////
        ////////// CELL OPENING //////////
        //////////////////////////////////

        onPressCell(oEvent) {
            const oCell = this.getObjectByEvent(oEvent);
            if (this.isGameFinished() || oCell.IsFlagged) return;
            this.insertMines(oCell.ID);
            this.handleOpeningCell(oCell);
            this.startTimer();
        },

        onRightPressCell(oEvent) {
            if (!this.isGameStarted()) return;
            const sPath = this.getPathByEvent(oEvent) + '/IsFlagged';
            const bFlagged = !this.getProperty(sPath);
            this.setProperty(sPath, bFlagged);
            this.updateFlagCount(bFlagged);
        },

        onDoublePressCell(oEvent) {
            const oCell = this.getObjectByEvent(oEvent);
            const aNeighbours = this.getNeighbourCells(oCell);
            const aFlaggedNeighbours = aNeighbours.filter(oCell => oCell.IsFlagged);
            const bReadyToOpen = oCell.MineCount === aFlaggedNeighbours.length;
            if (!bReadyToOpen) return;
            aNeighbours.filter(oCell => !oCell.IsFlagged)
                .forEach(oCell => this.handleOpeningCell(oCell));
        },

        handleOpeningCell(oCell) {
            this.openCells(oCell);
            const bGameLost = oCell.IsMine;
            if (bGameLost) this.setProperty('/SelectedMine', oCell.ID)
            if (bGameLost || this.isGameWon()) this.finishGame(!bGameLost);
        },

        // TODO: check callstack for big fields
        openCells(oCell) {
            oCell = this.openCell(oCell);
            if (!oCell || oCell.MineCount || oCell.IsMine) return;
            const aNeighbours = this.getNeighbourCells(oCell);
            aNeighbours.forEach(oCell => this.openCells(oCell));
        },

        openCell(oCell) {
            if (oCell.IsOpen) return;
            if (!oCell.IsMine) {
                const iCellsLeft = this.getProperty('/CellsLeft') - 1;
                this.setProperty('/CellsLeft', iCellsLeft);
                oCell.MineCount = this.getCellMineCount(oCell) || '';
            };
            if (oCell.IsFlagged) this.updateFlagCount();
            oCell.IsFlagged = false;
            oCell.IsOpen = true;
            return oCell;
        },

        updateFlagCount(bDecrease) {
            let iFlags = this.getProperty('/Flags');
            iFlags -= bDecrease ? 1 : -1;
            this.setProperty('/Flags', iFlags);
        },

        getCellMineCount(oCell) {
            const aNeighbours = this.getNeighbourCells(oCell);
            return aNeighbours.filter(oCell => oCell.IsMine).length;
        },

        getNeighbourCells(oCell) {
            const aField = this.getField();
            const aDiff = [-1, 0, 1];
            const aNeighbours = [];
            aDiff.forEach(iRowDiff => {
                aDiff.forEach(iColDiff => {
                    const [x, y] = oCell.Coordinates;
                    const oNeighbour = aField[x + iColDiff]?.[y + iRowDiff];
                    if (oNeighbour && oCell !== oNeighbour) aNeighbours.push(oNeighbour);
                });
            });
            return aNeighbours;
        },

        finishGame(bWon) {
            this.setProperty('/GameFinished', true);
            MessageToast.show(bWon ? 'You won' : 'Game over');
            this.showMines();
            this.stopTimer();
            if (bWon) this.setProperty('/Flags', 0);
        },

        showMines() {
            const aCells = this.getCells();
            const aMines = aCells.filter(oCell => oCell.IsMine && !oCell.IsFlagged);
            aMines.forEach(oMine => this.openCell(oMine));
        },

        onPressRestartGame() {
            this.setupGame();
        },

        onChangeLevel(oEvent) {
            const oSelectedItem = oEvent.getParameter('selectedItem');
            this.setNewLevel(this.getObjectByControl(oSelectedItem));
        },

        setNewLevel(oLevel) {
            this.setProperty('/Level', oLevel);
            localStorage.setItem('level', oLevel.Key)
            this.setupGame();
        },

        isGameStarted() {
            const iCellsLeft = this.getProperty('/CellsLeft');
            const { Width, Height, Mines } = this.getCurrentLevel();
            const bStarted = iCellsLeft !== Width * Height - Mines;
            return bStarted && !this.isGameFinished();
        },

        isGameWon() {
            return !this.getProperty('/CellsLeft');
        },

        isGameFinished() {
            return this.getProperty('/GameFinished');
        },

        getField() {
            return this.getProperty('/Field')
        },

        getCells() {
            return this.getField().flat();
        },

        getCurrentLevel() {
            return this.getProperty('/Level');
        },

        onPressApplySettings() {
            if (!this.isSettingsValid()) return MessageToast.show('Enter correct values');
            const oLevel = this.getProperty('/CustomLevel', 'view');
            this.setProperty('/Level', oLevel);
            this.setProperty('/Levels/3', oLevel);
            this.saveSettingsToLocalStorage();
            this.setupGame();
            this.oSettingsDialog.close();
        },

        saveSettingsToLocalStorage() {
            const oLevel = this.getProperty('/CustomLevel', 'view');
            Object.keys(oLevel)
                .filter(sKey => sKey !== 'Key')
                .forEach(sKey => localStorage.setItem('custom' + sKey, oLevel[sKey]));
        },

        isSettingsValid() {
            const oFormatter = this.formatter;
            const { Width, Height, Mines } = this.getProperty('/CustomLevel', 'view');
            const bSizeValid = [Width, Height]
                .every(iSize => oFormatter.fieldSizeState(iSize) === 'None');
            const bMinesValid = oFormatter.minesCountState(Mines, Width, Height) === 'None';
            return bSizeValid && bMinesValid;
        },

        onPressOpenSettingsDialog() {
            this.stopTimer();
            const oLevel = { ...this.getCurrentLevel() };
            this.setProperty('/CustomLevel', oLevel, 'view');
            this.openDialog('SettingsDialog');
        }

    });
});
