sap.ui.define([
	'sap/ui/core/UIComponent',
	'./model/models',
	'./util/themeHelper',
	'./util/languageHelper',
	'sap/ui/core/IconPool'
], function (UIComponent, models, themeHelper, languageHelper, IconPool) {
	'use strict';

	return UIComponent.extend('pharelyshau.Component', {
		metadata: {
			interfaces: ['sap.ui.core.IAsyncContentCreation'],
			manifest: 'json'
		},

		init() {
			// call the base component's init function and create the App view
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
			this.setModel(models.createDeviceModel(), 'device');
			languageHelper.initLanguage();
			themeHelper.initTheme();
			this.loadFioriIcons();
		},

		loadFioriIcons() {
			const oFioriIconsFont = {
				fontFamily: "SAP-icons-TNT",
				fontURI: sap.ui.require.toUrl("sap/tnt/themes/base/fonts/")
			};
			IconPool.registerFont(oFioriIconsFont);
		}

	});
});
