import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Dialog from "sap/m/Dialog";
import { SelectDialog$SearchEvent } from "sap/m/SelectDialog";
import TableSelectDialog, { TableSelectDialog$ConfirmEvent, TableSelectDialog$ConfirmEventParameters, TableSelectDialog$SearchEvent } from "sap/m/TableSelectDialog";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import Router from "sap/ui/core/routing/Router";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import formatter from "../model/formatter";
import Input, { Input$SubmitEvent } from "sap/m/Input";
import { Input$ChangeEvent } from "sap/ui/webc/main/Input";
import { InputBase$ChangeEvent } from "sap/m/InputBase";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataListBinding from "sap/ui/model/odata/v2/ODataListBinding";
import Context from "sap/ui/model/odata/v2/Context";
import MessageBox from "sap/m/MessageBox";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import EventProvider from "sap/ui/base/EventProvider";
import { ERP } from "../modules/ERP";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";


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
    private ZSD_SALES_DOC_GET_SRV_01 : ODataModel;
    public formater = formatter;
    


    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.oCreateOrderModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this.ZSD_SALES_DOC_GET_SRV_01 = this.getOwnerComponent()?.getModel("ZSD_SALES_DOC_GET_SRV_01") as ODataModel; 
    }

    public async onOpenPopUpEstimationNumber(): Promise<void> {
        this.oFragmentEstimationNumber ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.SelectDialogEstimationNumber",
            controller: this,
        }) as Dialog;
        
        this.getView()?.addDependent(this.oFragmentEstimationNumber);
        this.oFragmentEstimationNumber.open();
    }

    public onSearchEstimationNumber(oEvent: TableSelectDialog$SearchEvent): void {
        let sValue: string = oEvent.getParameter("value") || "";
        // let arrFilters = [
        //     new Filter("Bukrs", FilterOperator.EQ, this.Customer.getBukrs()),
        //     new Filter("Land1", FilterOperator.EQ, this.Customer.getLand1()),
        //     new Filter("Spart", FilterOperator.EQ, this.Customer.getSpart()),
        //     new Filter("Code", FilterOperator.EQ, sValue),
        //     new Filter("Type", FilterOperator.EQ, 'COD_TROUBLE' )
        // ];
        // let oBinding = oEvent.getSource().getBinding("items");
        // oBinding.filter(arrFilters);
    }

    public onSelectEstimationNumber( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        let oSlctEstimationNumber =  this.oCreateOrderModel.getProperty('/oSelectEstimationNumber');
        // TODO: Crear funcionalidad de seleccion de datos por medio de un oData
        for (const oSelectEstimationNumber of oSelectedContext) {
            this.oCreateOrderModel.setProperty('/oSelectEstimationNumber', oSelectEstimationNumber);
        }
        // Si el Odata no arroja ningun valor al seleccionar el numero de estimacion, se muestra mensaje de error  
        if (oSlctEstimationNumber.length === 0 ) throw new Error(this.oI18n.getText("errorEstimationNumber"));
        
        
        // let oSelectedContex = oEvent.getParameter("selectedContexts"),
        //         that = this;
        //     if (oSelectedContex) {
        //         oSelectedContex.forEach(oSelect => {
        //             that.idValueHelpsBrand.setValue(oSelect.getObject().VtextSpart);
        //             that.setsLand1(oSelect.getObject().Land1);
        //             that.setSpart(oSelect.getObject().Spart)
        //             that.setsVtextSpart(oSelect.getObject().VtextSpart)
        //         });
        //     }
    }

    public async onEstimationNumber(oEvent: Input$SubmitEvent) : Promise<void> {
        try {
            BusyIndicator.show();
            const sValue = oEvent.getParameter("value") || '';

            if (!sValue) throw new Error(this.oI18n.getText("errorEstimateNumber"));

            const sEntityWithKeys = ERP.generateEntityWithKeys('/SalesOrderHeaderSet',{
                DocNumber: sValue
            });
            const {data: oResponse} = await ERP.readDataKeysERP(sEntityWithKeys, this.ZSD_SALES_DOC_GET_SRV_01,{
                bParam: true,
                oParameter: {$expand: 'SalesOrderItems'}
            });

            this.oCreateOrderModel.setProperty('/oSalesOrder', oResponse);
            this.oCreateOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', true);

        } catch (oError: any) {
            const sErrorMessageDefault = this.oI18n.getText("errorEstimateNumber");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);

            this.oCreateOrderModel.setProperty('/oConfig/oAcctionBtnViewSalesCreate/enabledSalesCreate', false);
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

    public onSelectRequest( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext = oEvent.getParameter("selectedContexts") || [];

        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach( oSelect  => {
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

    public onSelectSalesOrganization( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach( oSelect  => {
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

    public onSelectChannel( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach( oSelect  => {
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

    public onSelectCurrency( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
        if (oSelectedContext.length > 0) {
            oSelectedContext.forEach( oSelect  => {
                // @ts-ignore
                this.oCreateOrderModel.setProperty(`/oQuery/selectCurrency`, oSelect.getObject());                
            });
        }
    }

    public onChangeFormatterNumber (oEvent: InputBase$ChangeEvent) : void{
        const oSource = oEvent.getSource();
        const oBinding = oSource.getBinding('value');
        const sPath = oBinding?.getPath() || '';
        const sValue = oEvent.getParameter("value") || "";
        const sReplaceVale = sValue.replace(/[^0-9,.]/g,'');
        this.oCreateOrderModel.setProperty(sPath,sReplaceVale);
    }

    public onOpenDetailSalesDocument(): void {
        this.oRouter.navTo("RouteDetailSalesOrder", {
            estimationNumber: "112312"
        })
    }
}