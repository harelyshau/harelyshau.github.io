sap.ui.define(['./BaseController', '../model/models'],
(BaseController, models) => {
	'use strict';

	return BaseController.extend('pharelyshau.controller.Algorithms', {
		onInit() {
            this.setModel(models.createAlgorithmsModel());
            this.setModel(models.createAlgorithmsViewModel(), 'view');
            this.getRouter().attachRouteMatched(this.onRouteMatched.bind(this));
		},
        
        onPressToggleSideNavigation() {
            const bPhone = this.getModel('device').getProperty('/system/phone');
            const oSideNavigation = bPhone ? this.byId('sideNavigation') : null;
            const oPage = bPhone ? this.getView().getParent().getParent() : this.byId("page");
            const bExpanded = this.toggleSideNavigation(oPage, oSideNavigation);
            this.getModel('view').setProperty('/sideExpanded', bExpanded);
        },

        onRouteMatched(oEvent) {
            const sArticleId = oEvent.getParameter('arguments').articleId ?? 'about';
            this.setCurrentArticle(sArticleId);
        },

        async setCurrentArticle(sArticleId) {
            const sPath = `resource/data/algorithms/${sArticleId}.json`;
            try {
                const oResponse = await fetch(sPath);
                const oArticle = await oResponse.json();
                this.getModel().setProperty('/Article', oArticle);
                document.title = oArticle.Title;
            } catch (e) {
                this.getModel().setProperty('/Article', 'NotFound');
            }
        }

	});
});
