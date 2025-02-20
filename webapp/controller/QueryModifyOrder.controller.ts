import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Dialog from "sap/m/Dialog";
import { TableSelectDialog$ConfirmEvent, TableSelectDialog$SearchEvent } from "sap/m/TableSelectDialog";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import Router from "sap/ui/core/routing/Router";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import formatter from "../model/formatter";
import { Input$SubmitEvent } from "sap/m/Input";
import { InputBase$ChangeEvent } from "sap/m/InputBase";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v2/ODataListBinding";
import MessageBox from "sap/m/MessageBox";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ERP from "com/triiari/retrobilling/modules/ERP";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import EventBus from "sap/ui/core/EventBus";

/**
 * @namespace com.triiari.retrobilling.controller
*/

export default class QueryModifyOrder extends Controller {
    private oModifyOrderModel: JSONModel;
    private oI18nModel: ResourceModel;
    private oI18n: ResourceBundle;
    private oFragmentEstimationNumber: Dialog;
    private oFragmentRequest: Dialog;
    private oFragmentSalesOrganization: Dialog;
    private oFragmentChannel: Dialog;
    private oFragmentCurrency: Dialog;
    private oRouter: Router;
    private ZSD_SALES_GET_DOC_SRV: ODataModel;
    public formater = formatter;

    public onInit() : void {
        this.oModifyOrderModel = this.getOwnerComponent()?.getModel("mModifyOrder") as JSONModel;
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this.ZSD_SALES_GET_DOC_SRV = this.getOwnerComponent()?.getModel("ZSD_SALES_GET_DOC_SRV") as ODataModel;

        EventBus.getInstance().subscribe("QueryModifyOrder", "clear", this.onClearFilter.bind(this));
    }

    public async onEstimationNumber(oEvent: Input$SubmitEvent) {
        const sValue = oEvent?.getParameter("value") ?? "";
        this.getEstimationNumber(sValue);
    }

    public async getEstimationNumber(sEstimationNumber: string): Promise<void> {
        try {
            BusyIndicator.show(0);

            if (!sEstimationNumber) throw new Error(this.oI18n.getText("errorEstimateNumber"));

            const sEntityWithKeys = ERP.generateEntityWithKeys('/SalesOrderHeaderSet', {
                DocNumber: sEstimationNumber
            });
            await ERP.readDataKeysERP(sEntityWithKeys, this.ZSD_SALES_GET_DOC_SRV);

            this.oModifyOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', true);
            this.oModifyOrderModel.setProperty('/oConfig/oMessageStripErrorNoValidEstimationNumber/visible', false);
        } catch (oError: any) {
            const sErrorMessageDefault = this.oI18n.getText("errorEstimateNumberSubmit");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);

            this.oModifyOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', false);
            this.oModifyOrderModel.setProperty('/oConfig/oMessageStripErrorNoValidEstimationNumber/visible', true);
        } finally {
            BusyIndicator.hide();
        }
    }

    public async onOpenPopUpEstimationNumber(): Promise<void> {

        const oQuery = this.oModifyOrderModel.getProperty('/oQuery');
        let arrFilter = [new Filter('Auart', FilterOperator.EQ, 'ZL6')];
        if (oQuery.selectCurrency) 
            arrFilter.push(new Filter("Waerk", FilterOperator.EQ, oQuery.selectCurrency.CurrencyCode));
        if (oQuery.selectRequest) 
            arrFilter.push(new Filter("Kunnr", FilterOperator.EQ, oQuery.selectRequest.CustomerCode));
        if (oQuery.selectSalesOrganization) 
            arrFilter.push(new Filter("Vkorg", FilterOperator.EQ, oQuery.selectSalesOrganization.SalesOrgVta));

        const oFilter = new Filter({
            filters: arrFilter,
            and: true
        });

        this.oFragmentEstimationNumber ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.SelectDialogEstimationNumber",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentEstimationNumber);
        const oBinding = this.oFragmentEstimationNumber.getBinding("items") as ODataListBinding;
        oBinding.filter(oFilter);
        this.oFragmentEstimationNumber.open();
    }

    public onSearchEstimationNumber(oEvent: TableSelectDialog$SearchEvent): void {
        let sValue: string = oEvent.getParameter("value") || "";
        let oFilter = new Filter({
            filters: [
                new Filter("Waerk", FilterOperator.Contains, sValue),
                new Filter("Kunnr", FilterOperator.Contains, sValue),
                new Filter("Vkorg", FilterOperator.Contains, sValue),
                new Filter('Auart', FilterOperator.EQ, 'ZTB1')
            ],
            and: false
        });
        let oBinding = oEvent.getSource().getBinding("items") as ODataListBinding;
        oBinding.filter([oFilter]);
    }

    public async onSelectEstimationNumber(oEvent: TableSelectDialog$ConfirmEvent): Promise<void> {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        for (const oSelect of oSelectedContext) {
            // @ts-ignore
            this.oModifyOrderModel.setProperty('/oSelectEstimationNumber', oSelect.getObject());
            // @ts-ignore
            this.oModifyOrderModel.setProperty('/oQuery/estimationNumber', oSelect.getObject().Vbeln);
            // @ts-ignore
            this.getEstimationNumber(oSelect.getObject().Vbeln);
        }
    }


    public async onOpenPopUpRequest(): Promise<void> {

        const oQuery = this.oModifyOrderModel.getProperty('/oQuery');
        let arrFilter = [];
        if (oQuery.selectSalesOrganization) 
            arrFilter.push(new Filter("CompanyCode", FilterOperator.EQ, oQuery.selectSalesOrganization.SalesOrgVta));

        const oFilter = new Filter({
            filters: arrFilter,
            and: true
        });

        this.oFragmentRequest ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.TblSelectDialogRequest",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentRequest);
        const oBinding = this.oFragmentRequest.getBinding("items") as ODataListBinding;
        oBinding.filter(oFilter);
        this.oFragmentRequest.open();
    }

    public onSearchRequest(oEvent: TableSelectDialog$SearchEvent): void {
        let sValue = oEvent.getParameter("value") || "";
        let oFilter = new Filter({
            filters: [
                new Filter("CustomerCode", FilterOperator.Contains, sValue),
                new Filter("Name1", FilterOperator.Contains, sValue),
                new Filter("CompanyCode", FilterOperator.Contains, sValue)
            ],
            and: false
        });
        let oBinding = oEvent.getSource().getBinding("items") as ODataListBinding;
        oBinding.filter([oFilter]);
    }

    public onSelectRequest(oEvent: TableSelectDialog$ConfirmEvent): void {
        const oSelectedContext = oEvent.getParameter("selectedContexts") || [];

        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach(oSelect => {
                // @ts-ignore
                this.oModifyOrderModel.setProperty(`/oQuery/selectRequest`, oSelect.getObject());
            });
        }
    }

    public async onOpenPopUpSalesOrganization(): Promise<void> {
        this.oFragmentSalesOrganization ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.TblSalesOrganization",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentSalesOrganization);
        this.oFragmentSalesOrganization.open();
    }

    public onSearchSalesOrganization(oEvent: TableSelectDialog$SearchEvent): void {
        let sValue: string = oEvent.getParameter("value") || "";
        let oFilter = new Filter({
            filters: [
                new Filter("DistChan", FilterOperator.Contains, sValue),
                new Filter("Description", FilterOperator.Contains, sValue)
            ],
            and: false
        });
        let oBinding = oEvent.getSource().getBinding("items") as ODataListBinding;
        oBinding.filter([oFilter]);
    }

    public onSelectSalesOrganization(oEvent: TableSelectDialog$ConfirmEvent): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach(oSelect => {
                // @ts-ignore
                this.oModifyOrderModel.setProperty(`/oQuery/selectSalesOrganization`, oSelect.getObject());
            });
        }
    }

    public onChangeFormatterNumber(oEvent: InputBase$ChangeEvent): void {
        const oSource = oEvent.getSource();
        const oBinding = oSource.getBinding('value');
        const sPath = oBinding?.getPath() || '';
        const sValue = oEvent.getParameter("value") || "";
        const sReplaceVale = sValue.replace(/[^0-9,.]/g, '');
        this.oModifyOrderModel.setProperty(sPath, sReplaceVale);
    }

    public async onOpenPopUpCurrency(): Promise<void> {
        this.oFragmentCurrency ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.TblSelectDialogCurrency",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentCurrency);
        this.oFragmentCurrency.open();
    }

    public onSearchCurrency(oEvent: TableSelectDialog$SearchEvent): void {
        let sValue: string = oEvent.getParameter("value") || "";
        let oFilter = new Filter({
            filters: [
                new Filter("CurrencyName", FilterOperator.Contains, sValue),
                new Filter("CurrencyCode", FilterOperator.Contains, sValue)
            ],
            and: false
        });
        let oBinding = oEvent.getSource().getBinding("items") as ODataListBinding;
        oBinding.filter([oFilter]);
    }

    public onSelectCurrency(oEvent: TableSelectDialog$ConfirmEvent): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach(oSelect => {
                // @ts-ignore
                this.oModifyOrderModel.setProperty(`/oQuery/selectCurrency`, oSelect.getObject());
            });
        }
    }

    public onOpenDetailSalesDocument(): void {
        try{
            const oQueryData = this.oModifyOrderModel.getProperty('/oQuery');

            this.onValidateData();

            this.oRouter.navTo("RouteDetailEditSalesOrder", {
                estimationNumber: oQueryData.estimationNumber,
                query: {
                    factor: oQueryData.iFactor
                },
            });
        } catch (oError: any) {
            MessageBox.error(oError.message);
        }
    }

    public onValidateData() : void {
        const oQueryData = this.oModifyOrderModel.getProperty('/oQuery');

        this.oModifyOrderModel.setProperty(
            '/oQuery/bToRequiredQuery', 
            !oQueryData.estimationNumber || !oQueryData.iFactor
        );

        if (!oQueryData.estimationNumber) 
            throw new Error(this.oI18n.getText("errorEstimateNumberEmpty"));
        if (!oQueryData.iFactor) 
          throw new Error(this.oI18n.getText("errorFactorEmpty"));  //FMS para el area de modificar, no es necesario un factor.
    }

    public onClearFilter() : void {
        const arrClearString = ['/estimationNumber', '/request', '/salesOrganization', '/channel', '/currency'];
        const arrClearNull = ['/selectSalesOrganization', '/selectRequest', '/selectChannel', '/selectCurrency'];
        const arrClearConfigFlags = ['/oAcctionTblItemSalesDocument/enabled', '/oAcctionTblItemSalesDocument/enabled', 
            '/oAcctionBtnViewSalesCreate/enabledSalesCreate'];
        const arrClearObj = ['/oSalesOrder', '/oSelectEstimationNumber'];

        arrClearString.forEach( sValue => {
            this.oModifyOrderModel.setProperty(`/oQuery${sValue}`, '');
        });

        arrClearNull.forEach( sValue => {
            this.oModifyOrderModel.setProperty(`/oQuery${sValue}`, null);
        });

        arrClearConfigFlags.forEach( sValue => {
            this.oModifyOrderModel.setProperty(`/oConfig${sValue}`, false);
        });

        arrClearObj.forEach( sValue => {
            this.oModifyOrderModel.setProperty(`${sValue}`, null);
        });

        this.oModifyOrderModel.setProperty(`/oConfig/bToRequiredQuery`, true);
        this.oModifyOrderModel.setProperty(`/oQuery/iFactor`, 0);
        this.oModifyOrderModel.refresh(true);
    }

}