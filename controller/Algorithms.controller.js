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
            const oPage = bPhone ? this.getView().getParent().getParent() : this.byId("page");
            const bExpanded = this.toggleSideNavigation(oPage, this.byId('sideNavigation'));
            this.getModel('view').setProperty('/sideExpanded', bExpanded);
        },

        onRouteMatched(oEvent) {
            const sArticleId = oEvent.getParameter('arguments').articleId;
            this.setCurrentArticle(sArticleId);
            this.getModel('view').setProperty('/ArticleID', sArticleId);
            if (!sArticleId) this.byId('sideNavigation').setSelectedItem(null);
        },

        async setCurrentArticle(sArticleId) {
            this.getModel('view').setProperty('/busy', true);
            try {
                const oArticle = await this.getArticle(this.getArticlePath(sArticleId));
                this.getModel().setProperty('/Article', oArticle);
                this.getModel('view').setProperty('/busy', false);
                document.title = oArticle.Title;
            } catch (oError) {
                if (oError.name === 'AbortError') return;
                this.getModel().setProperty('/Article', { NotFound: true });
                this.getModel('view').setProperty('/busy', false);
            }
        },

        async getArticle(sArticlePath) {
            if (this.oAbortContorller) this.oAbortContorller.abort();
            this.oAbortContorller = new AbortController();
            const oResponse = await fetch(sArticlePath, { signal: this.oAbortContorller.signal });
            return await oResponse.json();
        },

        getArticlePath(sArticleId) {
            const sRootPath = 'resource/data/algorithms/';
            const sAdditionalPath = sArticleId ? `articles/${sArticleId}` : 'about';
            return `${sRootPath}${sAdditionalPath}.json`;
        },

        onSelectNavigateToArticle(oEvent) {
            const oItem = oEvent.getParameter('item');
            let articleId = this.getObjectByControl(oItem).ID;
            articleId ??= this.getObjectByControl(oItem.getItems()[0]).ID;
            this.getRouter().navTo('Algorithm', { articleId });
        },

        factoryBlocks(sId, oContext) {
            const sType = oContext.getProperty('Type');
            return this.byId(`block${sType}`).clone(sId);
        },

        refreshSideNavigationSelectedKey() {
            setTimeout(() => {
                const sKey = this.getModel('view').getProperty('/ArticleID');
                this.byId('sideNavigation').setSelectedKey(sKey);
            });
        }

	});
});
