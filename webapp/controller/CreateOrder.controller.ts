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

export default class CreateOrder extends Controller {

    private oCreateOrderModel: JSONModel;
    private oI18nModel: ResourceModel;
    private oI18n: ResourceBundle;
    private oFragmentEstimationNumber: Dialog;
    private oFragmentRequest: Dialog;
    private oFragmentSalesOrganization: Dialog;
    private oFragmentChannel: Dialog;
    private oFragmentCurrency: Dialog;
    private oRouter: Router;
    private ZSD_SALES_DOC_GET_SRV_01: ODataModel;
    private ZSD_SALES_GET_DOC_SRV: ODataModel;
    public formater = formatter;



    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.oCreateOrderModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this.ZSD_SALES_DOC_GET_SRV_01 = this.getOwnerComponent()?.getModel("ZSD_SALES_DOC_GET_SRV_01") as ODataModel;
        this.ZSD_SALES_GET_DOC_SRV = this.getOwnerComponent()?.getModel("ZSD_SALES_GET_DOC_SRV") as ODataModel;

        EventBus.getInstance().subscribe("CreateOrder", "clear", this.onClearFilter.bind(this));
    }

    public async onOpenPopUpEstimationNumber(): Promise<void> {

        const oQuery = this.oCreateOrderModel.getProperty('/oQuery');
        let arrFilter = [new Filter('Auart', FilterOperator.EQ, 'ZTB1')];
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
            this.oCreateOrderModel.setProperty('/oSelectEstimationNumber', oSelect.getObject());
            // @ts-ignore
            this.oCreateOrderModel.setProperty('/oQuery/estimationNumber', oSelect.getObject().Vbeln);
            // @ts-ignore
            this.getEstimationNumber(oSelect.getObject().Vbeln);
        }
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

            this.oCreateOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', true);
            this.oCreateOrderModel.setProperty('/oConfig/oMessageStripErrorNoValidEstimationNumber/visible', false);
        } catch (oError: any) {
            const sErrorMessageDefault = this.oI18n.getText("errorEstimateNumberSubmit");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);

            this.oCreateOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', false);
            this.oCreateOrderModel.setProperty('/oConfig/oMessageStripErrorNoValidEstimationNumber/visible', true);
        } finally {
            BusyIndicator.hide();
        }
    }

    public async onOpenPopUpRequest(): Promise<void> {
        this.oFragmentRequest ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.TblSelectDialogRequest",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentRequest);
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
                this.oCreateOrderModel.setProperty(`/oQuery/selectRequest`, oSelect.getObject());
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
                this.oCreateOrderModel.setProperty(`/oQuery/selectSalesOrganization`, oSelect.getObject());
            });
        }
    }

    public async onOpenPopUpChannel(): Promise<void> {
        this.oFragmentChannel ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.TblSelectDialogChannel",
            controller: this,
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentChannel);
        this.oFragmentChannel.open();
    }

    public onSearchChannel(oEvent: TableSelectDialog$SearchEvent): void {
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

    public onSelectChannel(oEvent: TableSelectDialog$ConfirmEvent): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach(oSelect => {
                // @ts-ignore
                this.oCreateOrderModel.setProperty(`/oQuery/selectChannel`, oSelect.getObject());
            });
        }
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
                this.oCreateOrderModel.setProperty(`/oQuery/selectCurrency`, oSelect.getObject());
            });
        }
    }

    public onChangeFormatterNumber(oEvent: InputBase$ChangeEvent): void {
        const oSource = oEvent.getSource();
        const oBinding = oSource.getBinding('value');
        const sPath = oBinding?.getPath() || '';
        const sValue = oEvent.getParameter("value") || "";
        const sReplaceVale = sValue.replace(/[^0-9,.]/g, '');
        this.oCreateOrderModel.setProperty(sPath, sReplaceVale);
    }

    public onOpenDetailSalesDocument(): void {
        try{
            const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');

            this.onValidateData();
            this.oRouter.navTo("RouteDetailSalesOrder", {
                estimationNumber: oQueryData.estimationNumber,
                query: {
                    factor: oQueryData.iFactor
                }
            });
        } catch (oError: any) {
            MessageBox.error(oError.message);
        }
    }

    public onValidateData() : void {
        const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');

        this.oCreateOrderModel.setProperty(
            '/oQuery/bToRequiredQuery', 
            !oQueryData.estimationNumber || !oQueryData.iFactor
        );

        if (!oQueryData.estimationNumber) 
            throw new Error(this.oI18n.getText("errorEstimateNumberEmpty"));
        if (!oQueryData.iFactor) 
            throw new Error(this.oI18n.getText("errorFactorEmpty"));       
    }

    public onClearFilter() : void {

        const arrClearString = ['/estimationNumber', '/request', '/salesOrganization', '/channel', '/currency'];
        const arrClearNull = ['/selectSalesOrganization', '/selectRequest', '/selectChannel', '/selectCurrency'];
        const arrClearConfigFlags = ['/oAcctionTblItemSalesDocument/enabled', '/oAcctionTblItemSalesDocument/enabled', 
            '/oAcctionBtnViewSalesCreate/enabledSalesCreate'];
        const arrClearObj = ['/oSalesOrder', '/oSelectEstimationNumber'];

        arrClearString.forEach( sValue => {
            this.oCreateOrderModel.setProperty(`/oQuery${sValue}`, '');
        });

        arrClearNull.forEach( sValue => {
            this.oCreateOrderModel.setProperty(`/oQuery${sValue}`, null);
        });

        arrClearConfigFlags.forEach( sValue => {
            this.oCreateOrderModel.setProperty(`/oConfig${sValue}`, false);
        });

        arrClearObj.forEach( sValue => {
            this.oCreateOrderModel.setProperty(`/oConfig${sValue}`, null);
        });

        this.oCreateOrderModel.setProperty(`/oConfig/bToRequiredQuery`, true);
        this.oCreateOrderModel.setProperty(`/oQuery/iFactor`, 0);
    }

}