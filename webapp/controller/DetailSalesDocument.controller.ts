import Dialog from "sap/m/Dialog";
import MessageToast from "sap/m/MessageToast";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/ui/table/Table";
import MessageBox from "sap/m/MessageBox";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import UIComponent from "sap/ui/core/UIComponent";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import Input, { Input$LiveChangeEvent, Input$SubmitEvent } from "sap/m/Input";
import Router from "sap/ui/core/routing/Router";
import { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import ERP from "com/triiari/retrobilling/modules/ERP";
import EventBus from "sap/ui/core/EventBus";
import { ItemOrder, Service, ServicesConditions } from "../model/types";
import { DialogType } from "sap/m/library";
import Label from "sap/m/Label";
import Float from "sap/ui/model/type/Float";
import Button from "sap/m/Button";
import StepInput from "sap/m/StepInput";
import { RowActionItem$PressEvent } from "sap/ui/table/RowActionItem";
import { InputBase$ChangeEvent } from "sap/m/InputBase";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { TreeTable$ToggleOpenStateEvent } from "sap/ui/table/TreeTable";
import Context from "sap/ui/model/Context";
// import { ERP } from "../modules/ERP";

interface DetailRouteArg {
    estimationNumber: string,
    "?query": {
        factor: string
    }
}

interface SalesHeaderIn {
    SalesOrg: string,
    DistrChan: string,
    Division: string,
    DocType: string,
    Currency: string,
    PurchNoC: string //no esta
    PurchDate: string | Date | null,
    Ref1: string //no esta
    Name: string,
    CtValidF: string | Date | null ,//no esta
    CtValidT: string | Date | null,//no esta
    PoDatS: string | Date | null,//no esta
    SdDocCat: string,
    CompCdeB: string,
    CurrIso: string
}

interface SalesItem {
    ItmNumber: string,
    Material: string,
    Plant: string,
    TargetQty: string,
    TargetQu: string //no esta
    TargetVal: string //no esta
    ItemCateg: string //no esta
    MatlGroup: string //no esta
    PurchDate: string | Date | null ,
    Ref1: string //no esta
    PoDatS: string | Date | null , //no esta
    SalesConditionsInSet: never[] // Que datos deben ir aca ?
}
/**
 * @namespace com.triiari.retrobilling.controller
 */
export default class DetailSalesDocument extends Controller {

    private oFragmentPositionPartitioning: Dialog | undefined;
    private oFragmentServices: Dialog | undefined;
    private oInfoTemp: JSONModel;
    private oI18nModel: ResourceModel;
    private oI18n: ResourceBundle;
    private oCreateOrderModel: JSONModel;
    private oRouter : Router;
    private ZSD_SALES_GET_DOC_SRV: ODataModel;
    private ZSD_SALES_CREATE_DOC_SRV_01: ODataModel;
    private oDialogConfirmPosition : Dialog; 

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.ZSD_SALES_GET_DOC_SRV = this.getOwnerComponent()?.getModel("ZSD_SALES_GET_DOC_SRV") as ODataModel;
        this.ZSD_SALES_CREATE_DOC_SRV_01 = this.getOwnerComponent()?.getModel("ZSD_SALES_GET_DOC_SRV") as ODataModel;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oCreateOrderModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
        this.oInfoTemp = new JSONModel({
            partitions: [
                {
                    pos: "10",
                    material: "Titanium",
                    quantity: 2,
                    unit: "SER",
                    amount: 5000
                },
                {
                    pos: "130",
                    material: "Titanium",
                    quantity: 2,
                    unit: "SER",
                    amount: 5000
                },
                {
                    pos: "140",
                    material: "Titanium",
                    quantity: 2,
                    unit: "SER",
                    amount: 5000
                }
            ]
        });
        this.getView()?.setModel(this.oInfoTemp, "temp");
        this.oRouter.getRoute("RouteDetailSalesOrder")?.attachMatched(this.onRouteMatched, this);
    }

    public onRouteMatched(oEvent: Route$MatchedEvent): void {
        const oArguments = oEvent.getParameter("arguments") as DetailRouteArg;
        const oQueryParams = oArguments["?query"];

        //Se asigna el valor al modelo para el escenario en que se entre directo en la ruta
        this.oCreateOrderModel.setProperty('/oQuery/iFactor', oQueryParams.factor);

        this.onQuerySalesOrder(oArguments?.estimationNumber);
        
    }

    public async onQuerySalesOrder(sSalesOrder: string ): Promise<void> {
        try {
            BusyIndicator.show(0);

            const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');

            const sEntityWithKeys = ERP.generateEntityWithKeys('/SalesOrderHeaderSet', {
                DocNumber: sSalesOrder
            });
           
            const { data: oResponse } = await ERP.readDataKeysERP(sEntityWithKeys, this.ZSD_SALES_GET_DOC_SRV, undefined, { 
                $expand: 'ToItems,ToConditions,ToPartners,ToServices' 
            });

            const arrSalesOrderItems =  oResponse.ToItems["results"];

            for (const oItem of arrSalesOrderItems) {
                oItem.editQuantity = false;
                oItem.TargetValCalculate = oItem.NetValue * parseFloat(oQueryData.iFactor)
            }
            
            this.oCreateOrderModel.setProperty('/oSalesOrder', oResponse);

        } catch (oError: any) {
            const sErrorMessageDefault = this.oI18n.getText("errorEstimateNumber");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);
        } finally {
            BusyIndicator.hide();
        }
    }

    public async onOpenPositionPartitioning(): Promise<void> {
        this.oFragmentPositionPartitioning ??= await Fragment.load({
            name: "com.triiari.retrobilling.view.fragment.PositionPartitioning",
            id: this.getView()?.getId(),
            controller: this
        }) as Dialog;

        this.getView()?.addDependent(this.oFragmentPositionPartitioning);

        this.oFragmentPositionPartitioning.open();
    }

    public onPositionPartitioning() {
        const arrPartitionByItem : ItemOrder[] = this.oCreateOrderModel.getProperty("/arrPartitionByItem");

        let arrItemsTable : ItemOrder[] = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');

        for (let i=0; i < arrPartitionByItem.length; i++){
            const oItemPartition = arrPartitionByItem[i];
            let oFindItemsTable = arrItemsTable.find( (oItem: ItemOrder) => oItem.ItmNumber === oItemPartition.ItmNumber);
            if (oFindItemsTable){
                oFindItemsTable.NetValue = oItemPartition.NetValue;
                continue;
            }
            arrItemsTable.push(oItemPartition);
        }

        this.oCreateOrderModel.refresh(true);
        this.onClosenPositionPartitioning();
        this.onCalculateItemsOrder();
    }

    public onClosenPositionPartitioning() {
        this.oCreateOrderModel.setProperty("/arrPartitionByItem", []);
        this.oCreateOrderModel.setProperty("/oConfig/oAcctionTblItemPartition/enabled", true);
        this.oCreateOrderModel.setProperty("/iNetValuePartititionByItem", 0);
        this.oCreateOrderModel.setProperty("/iCalculateModifiedValuePartititionByItem", 0);
        this.oCreateOrderModel.setProperty("/iCalculateAmountExceeded", 0);
        this.oCreateOrderModel.setProperty("/sUMBPartititionByItem", '');
        this.oCreateOrderModel.setProperty("/iQuantityPartition", 1);
        this.oCreateOrderModel.refresh(true);
        this.onRemoveSelectionItem();
        this.oFragmentPositionPartitioning?.close();
    }

    public oAfterClosenPositionPartitioning() {
        this.oFragmentPositionPartitioning?.destroy();
        this.oFragmentPositionPartitioning = undefined;
    }

    public onSelectRowItemSaleDocument() {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrSelectRows = oTblSalesDocument.getSelectedIndices();

        this.oCreateOrderModel.setProperty('/oConfig/oAcctionTblItemSalesDocument/enabled', arrSelectRows.length > 0);
        this.oCreateOrderModel.setProperty('/oConfig/oAcctionTblItemSalesDocumentSingle/enabled', arrSelectRows.length === 1);
    }

    public removeSelectedPositions() {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const arrSelectedIndices = oTblSalesDocument.getSelectedIndices();
        const arrPurgedItems = [];

        for(let i = 0; i < arrItemsTable.length; i++) {
            if(arrSelectedIndices.includes(i)){
                oTblSalesDocument.removeSelectionInterval(i, i);
                continue;
            }
            arrPurgedItems.push(arrItemsTable[i]);
        }

        this.oCreateOrderModel.setProperty('/oSalesOrder/ToItems/results', arrPurgedItems);
        this.onRemoveSelectionItem();
    }

    public onConfirmRemovePosition(): void {
        MessageBox.warning(this.oI18n.getText('confirmRemovePosition') || '', {
            actions: [this.oI18n.getText('not') || '', this.oI18n.getText('yes') || ''],
            emphasizedAction: this.oI18n.getText('yes'),
            onClose: (sAction: string) => {
                if (sAction !== this.oI18n.getText('yes')) {
                    this.onRemoveSelectionItem();
                    return;
                }

                this.removeSelectedPositions();
                this.onCalculteAllPositions();
            },
            dependentOn: this.getView()
        });
    }

    public editSelectedPositions(): void {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const arrSelectedIndices = oTblSalesDocument.getSelectedIndices();
        arrItemsTable[arrSelectedIndices[0]].editQuantity = true;

        this.oCreateOrderModel.setProperty('/iColumnEditSalesDocument',arrSelectedIndices[0]);
        this.oCreateOrderModel.refresh(true);
    }

    public submitQuantity(oEvent: Input$SubmitEvent): void {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const iColumnEditSalesDocument = this.oCreateOrderModel.getProperty('/iColumnEditSalesDocument');
        arrItemsTable[iColumnEditSalesDocument].editQuantity = false;
        oTblSalesDocument.removeSelectionInterval(0,arrItemsTable.length);
        this.oCreateOrderModel.refresh(true);
    }

    public onClose() {
        this.oRouter.navTo("RouteMain");
        EventBus.getInstance().publish("CreateOrder", "clear");
    }

    public onConfirmCopyPosition(): void {

        const oSelectItem = structuredClone(this.onSelectItem());

        MessageBox.warning(this.oI18n.getText('confirmDividePosition', [oSelectItem.ItmNumber]) || '', {
            actions: [this.oI18n.getText('not') || '', this.oI18n.getText('yes') || ''],
            emphasizedAction: this.oI18n.getText('yes'),
            onClose: (sAction: string) => {
                if (sAction !== this.oI18n.getText('yes')) {
                    this.onCopyPosition(oSelectItem);
                    this.onRemoveSelectionItem();
                }else{
                    this.onDividePosition();
                }
            },
            dependentOn: this.getView()
        });
    }

    public onSelectItem() : ItemOrder {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const arrSelectedIndices = oTblSalesDocument.getSelectedIndices();
        let oSelectItemOrder;

        for(let i = 0; i < arrItemsTable.length; i++) {
            if(arrSelectedIndices.includes(i)){
                oSelectItemOrder = arrItemsTable[i] ;
                break;
            }
        }

        return oSelectItemOrder;
    }

    public onCopyPosition(oSelectItem: ItemOrder) : void {
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const iLength = arrItemsTable.length;
        const iCalculatePosition : number = (iLength*10) + 10;
        oSelectItem.ItmNumber = iCalculatePosition.toString().padStart(6,'0');
        arrItemsTable.push(oSelectItem);
        this.oCreateOrderModel.refresh(true);
    }

    public onDividePosition() : void {
        if (!this.oDialogConfirmPosition){
            this.oDialogConfirmPosition = new Dialog(
                {
					type: DialogType.Message,
					title: this.oI18n.getText('Confirm'),
                    icon: "sap-icon://hint",
					content: [
                        new Label({
                            text: this.oI18n.getText('quantityDivide')
                        }),
                        new StepInput({
                            min:0,
                            value: "{mCreateOrder>/iQuantityPartition}"
                        })
					],
					beginButton: new Button({
                        type: "Accept",
                        icon: "sap-icon://open-command-field",
                        text: this.oI18n.getText("continue"),
                        press: () => {
                            this.onCalculatePartition();
                            this.onOpenPositionPartitioning();
                            this.oDialogConfirmPosition.close();
                        }
                    }),
                    endButton: new Button({
                        type: "Reject",
                        text: this.oI18n.getText('cancel'),
                        icon: "sap-icon://reset",
                        press:  () => {
                            this.oCreateOrderModel.setProperty("/iQuantityPartition", 0);
                            this.onRemoveSelectionItem();
                            this.oDialogConfirmPosition.close();
                        }
                    })
				}
            );
            this.getView()?.addDependent(this.oDialogConfirmPosition);
        }

        this.oDialogConfirmPosition.open();
    }

    public onRemoveSelectionItem() : void {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        oTblSalesDocument.removeSelectionInterval(0,arrItemsTable.length);
    }

    public onCalculteAllPositions(): void {
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');

        for (let i = 0; i < arrItemsTable.length; i++) {
            let oItemOrder = arrItemsTable[i];
            const iCalculatePosition: number = (i + 1) * 10;
            oItemOrder.ItmNumber = iCalculatePosition.toString().padStart(6, '0');
        }

        this.oCreateOrderModel.refresh(true);
    }

    public onCalculatePartition() : void {
        const oSelectItem = this.onSelectItem();
        const iNumberPartition =  parseFloat(this.oCreateOrderModel.getProperty("/iQuantityPartition")) + 1;
        const iNetValue = parseFloat(oSelectItem.NetValue); 
        const iNetValueByPartition = iNetValue / iNumberPartition;
        const arrOrderItems = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        const iLengthOrderItems = arrOrderItems.length;

        let arrPartitionByItem : ItemOrder[] = [];
        let iCalculateModifiedValuePartititionByItem = 0;
        let iCalculateAmountExceeded = 0;

        for(let i = 0; i<iNumberPartition; i++){
            const oSelectItemByPartition = structuredClone(oSelectItem);
            oSelectItemByPartition.NetValue = Math.round(iNetValueByPartition).toString();//iNetValueByPartition.toFixed(2);
            let iLengthArrPartitionByItem = arrPartitionByItem.length;
            let iCalculatePosition  = 0;
            if (i !== 0)  {
                iCalculatePosition = (iLengthOrderItems + iLengthArrPartitionByItem) * 10;
                oSelectItemByPartition.ItmNumber = iCalculatePosition.toString().padStart(6,'0');
            }
            iCalculateModifiedValuePartititionByItem += Math.round(iNetValueByPartition);
            arrPartitionByItem.push(oSelectItemByPartition);
        }

        iCalculateAmountExceeded = iNetValue - iCalculateModifiedValuePartititionByItem;
        arrPartitionByItem[0].NetValue = (parseFloat(arrPartitionByItem[0].NetValue) +  iCalculateAmountExceeded).toString();
        this.oCreateOrderModel.setProperty("/iNetValuePartititionByItem", iNetValue);
        this.oCreateOrderModel.setProperty("/iCalculateModifiedValuePartititionByItem", iNetValue);
        this.oCreateOrderModel.setProperty("/sUMBPartititionByItem", oSelectItem.TargetQu);
        this.oCreateOrderModel.setProperty("/arrPartitionByItem", arrPartitionByItem);
        this.oCreateOrderModel.refresh(true);
    }

    public onCalculateAmountAssignedPartitionByItem() : void{
        const arrPartitionByItem = this.oCreateOrderModel.getProperty("/arrPartitionByItem");
        const iNetValuePartititionByItem = parseFloat(this.oCreateOrderModel.getProperty("/iNetValuePartititionByItem"));

        let iCalculateAmountExceeded = 0;
        let iCalculateModifiedValuePartititionByItem = 0;

        arrPartitionByItem.forEach((oItem : ItemOrder) => {
            iCalculateModifiedValuePartititionByItem += parseFloat(oItem.NetValue);
        });

        iCalculateAmountExceeded = iNetValuePartititionByItem - iCalculateModifiedValuePartititionByItem;

        this.oCreateOrderModel.setProperty("/iCalculateAmountExceeded", iCalculateAmountExceeded < 0 ? Math.abs(iCalculateAmountExceeded) : '');
        this.oCreateOrderModel.setProperty("/oConfig/oAcctionTblItemPartition/enabled", !(iCalculateAmountExceeded < 0));
        this.oCreateOrderModel.setProperty("/iCalculateModifiedValuePartititionByItem", iCalculateModifiedValuePartititionByItem);
        this.oCreateOrderModel.refresh(true);

    }

    public convertServicesToHierarchy(arrServices: Service[]): Service[] {
        const oMapLevelsServices: Record<string, Service> = {};
        const arrRoots = [];
        for(const oPos of arrServices) {
            if(oPos.Service) continue;
            oPos.children = [];
            oMapLevelsServices[oPos.LineNo] = oPos;
        }

        for(const oPos of arrServices) {
            if(oPos.ExtLine !== "0000000000" && oPos.OutlLevel !== 0) {
                if(oPos.SubpckgNo !== "0000000000") {
                    oPos.children?.push({
                        SubpckgNo: oPos.SubpckgNo
                    } as Service);
                }
                const oParent = oMapLevelsServices[oPos.ExtLine];
                if(oParent) oParent.children?.push(oPos);
            } else {
                arrRoots.push(oPos);
            }
        }
        return arrRoots;
    }

    public async onOpenServicesFragment(oEvent: RowActionItem$PressEvent) {
        const oButton = oEvent.getSource();
        const oContext = oButton.getBindingContext("mCreateOrder");
        const oInfoRow = oContext?.getObject() as ItemOrder;
        try {
            BusyIndicator.show(0);
            this.oFragmentServices ??= await Fragment.load({
                name: "com.triiari.retrobilling.view.fragment.Services",
                id: this.getView()?.getId(),
                controller: this
            }) as Dialog;
    
            this.getView()?.addDependent(this.oFragmentServices);

            const arrServices = await this.getServicesByPackageNumber(oInfoRow.PckgNo);
            this.oCreateOrderModel.setProperty('/oService', {
                services: this.convertServicesToHierarchy(arrServices)
            });

            this.oFragmentServices.bindElement(`mCreateOrder>/oService`);
            this.oFragmentServices.open();
        } catch(oError: unknown) {
            if(oError instanceof Error ) {
                MessageBox.error(oError.message);
                return;
            }
            throw oError;
        } finally {
            BusyIndicator.hide();
        }
    }

    public onCloseServicesFragment() {
        this.oFragmentServices?.close();
    }

    public onAfterCloseServicesFragment() {
        this.oFragmentServices?.destroy();
        this.oFragmentServices = undefined;
    }

    public async onToggleOpenStateServices(oEvent: TreeTable$ToggleOpenStateEvent): Promise<void> {
        const oTable = oEvent.getSource();
        try {
            oTable.setBusy(true);
            const oContext = oEvent.getParameter("rowContext") as Context;
            const bExpanded = oEvent.getParameter("expanded");
            const oInfo = oContext.getObject() as Service;

            if(oInfo.SubpckgNo === "0000000000" || !bExpanded) return;

            const oModel = oContext.getModel() as JSONModel;
            const arrServices = await this.getServicesByPackageNumber(oInfo.SubpckgNo);
            oModel.setProperty(`${oContext.getPath()}/children`, arrServices);
        } catch(oError: unknown){
            if(oError instanceof Error) {
                MessageBox.error(oError.message);
                return;
            }
            throw oError;
        } finally {
            oTable.setBusy(false);
        }
    }

    public async getServicesByPackageNumber(sPackageNumber: string): Promise<Service[]> {
        const sCurrentDocument: string = this.oCreateOrderModel.getProperty('/oSalesOrder/DocNumber');
        const sEntityWithKeys = ERP.generateEntityWithKeys("/SalesOrderHeaderSet", {
            DocNumber: sCurrentDocument
        });
        const sEntityWithChild = `${sEntityWithKeys}/ToServices`;
        const { data } = await ERP.readDataKeysERP(
            sEntityWithChild, 
            this.ZSD_SALES_GET_DOC_SRV, 
            [new Filter("PckgNo", FilterOperator.EQ, sPackageNumber)]
        );

        const arrResults = data.results as Service[];
        return arrResults;
    }

    public onCalculateItemsOrder() : void {
        
        const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');

        let arrSalesOrderItems : ItemOrder[] = this.oCreateOrderModel.getProperty('/oSalesOrder/ToItems/results');
        for (const oItem of arrSalesOrderItems) {
            oItem.editQuantity = false;
            oItem.TargetValCalculate = parseFloat(oItem.NetValue) * parseFloat(oQueryData.iFactor)
        }

        this.oCreateOrderModel.refresh(true);
    }

    public async onCreateOrder() : Promise<void> {
        try {
            BusyIndicator.show(0);
            const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
            const arrItems = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToItems/results`);
            let oJsonCreate = {
                SalesHeaderIn: this.getSalesHeader(),
                SalesItemsInSet: this.getSalesItemsInSet(),
                SalesPartnersSet: {},
                ReturnSet: []
            };

            // create call ERP
            MessageBox.information(this.oI18n.getText("infoDunctionBuild") || '');

            // const { data: oResponse } = await ERP.createDataERP('/SalesHeaderSet', 
            // this.ZSD_SALES_CREATE_DOC_SRV_01, { 
            //     oJsonCreate
            // });


        } catch (oError : any) {
            const sErrorMessageDefault = this.oI18n.getText("errorCreateSalesOrder");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);
        } finally {
            BusyIndicator.hide();
        }
    }

    public getSalesHeader () : SalesHeaderIn {
        const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
        const oSalesHeader : SalesHeaderIn = {
            SalesOrg: oSalesOrder.SalesOrg,
            DistrChan: oSalesOrder.DistrChan,
            Division: oSalesOrder.Division,
            DocType: oSalesOrder.DocType,
            Currency: oSalesOrder.Currency,
            PurchNoC: "sefsf", //no esta
            PurchDate: oSalesOrder.PurchDate,
            Ref1: "sefsf", //no esta
            Name: oSalesOrder.DocNumber,
            CtValidF: oSalesOrder.CtValidF,//no esta
            CtValidT: oSalesOrder.CtValidT,//no esta
            PoDatS: "\/Date(1738021010567)\/",//no esta
            SdDocCat: oSalesOrder.SdDocCat,
            CompCdeB: oSalesOrder.CompCode,
            CurrIso: oSalesOrder.CurrenIso
        };
        
        return oSalesHeader;
    }

    public getSalesItemsInSet () : SalesItem[] {
        const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
        const arrItems = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToItems/results`);
        let arrSalesItems = [];
        for (const oItems of arrItems) {
            const oSalesItem : SalesItem = {
                ItmNumber: oItems.ItmNumber,
                Material: oItems.oItems,
                Plant: oItems.Plant,
                TargetQty: oItems.TargetQty,
                TargetQu: "BLS", //no esta
                TargetVal: "23", //no esta
                ItemCateg: "MID", //no esta
                MatlGroup: "01", //no esta
                PurchDate: oSalesOrder.PurchDate,
                Ref1: "sefsf", //no esta
                PoDatS: "\/Date(1738021010567)\/", //no esta
                SalesConditionsInSet: [] // Que datos deben ir aca ?
            }
            arrSalesItems.push(oSalesItem);
        }
        return arrSalesItems;
    }
}