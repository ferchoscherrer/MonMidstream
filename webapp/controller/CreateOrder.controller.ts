import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Dialog from "sap/m/Dialog";
import { SelectDialog$SearchEvent } from "sap/m/SelectDialog";
import TableSelectDialog, { TableSelectDialog$ConfirmEvent, TableSelectDialog$SearchEvent } from "sap/m/TableSelectDialog";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import Router from "sap/ui/core/routing/Router";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import formatter from "../model/formatter";
import Input from "sap/m/Input";
import { Input$ChangeEvent } from "sap/ui/webc/main/Input";
import { InputBase$ChangeEvent } from "sap/m/InputBase";

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
    public formater = formatter;

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.oCreateOrderModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
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
        let sValue: string = oEvent.getParameter("value") || "";
    }

    public onSelectRequest( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
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
    }

    public onSelectSalesOrganization( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
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
    }

    public onSelectChannel( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
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
    }

    public onSelectCurrency( oEvent: TableSelectDialog$ConfirmEvent ): void {
        const oSelectedContext: string[] = oEvent.getParameter("selectedContexts") || [];
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