import Dialog from "sap/m/Dialog";
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
import { Input$SubmitEvent } from "sap/m/Input";
import Router from "sap/ui/core/routing/Router";
import { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import ERP from "com/triiari/retrobilling/modules/ERP";
import EventBus from "sap/ui/core/EventBus";
import { 
    ItemOrder, Service, ServicesConditions, SalesItemConditionERP, SalesPartnersERP, MessageERP, 
    SalesHeaderIn, SalesItemERP, SalesServicesERP, OrderHeaderInERP, SalesItemsInERPModify,
    Partner, ServiceByItem
} from "../model/types";
import { DialogType } from "sap/m/library";
import Label from "sap/m/Label";
import Button from "sap/m/Button";
import StepInput from "sap/m/StepInput";
import { RowActionItem$PressEvent } from "sap/ui/table/RowActionItem";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import { TreeTable$ToggleOpenStateEvent } from "sap/ui/table/TreeTable";
import Context from "sap/ui/model/Context";
import MessageView from "sap/m/MessageView";
import MessageItem from "sap/m/MessageItem";
import Bar from "sap/m/Bar";
import Title from "sap/m/Title";

interface DetailRouteArg {
    estimationNumber: string,
    "?query": {
        factor: string
    }
    "?modify": boolean 
}

/**
 * @namespace com.triiari.retrobilling.controller
 */
export default class DetailSalesDocument extends Controller {

    private oFragmentPositionPartitioning: Dialog | undefined;
    private oFragmentServices: Dialog | undefined;
    private oI18nModel: ResourceModel;
    private oI18n: ResourceBundle;
    private oCreateOrderModel: JSONModel;
    private oRouter : Router;
    private ZSD_SALES_GET_DOC_SRV: ODataModel;
    private ZSD_SALES_CREATE_DOC_SRV_01: ODataModel;
    private ZSD_SALES_CHANGE_DOC_SRV: ODataModel;
    private oDialogConfirmPosition : Dialog; 
    private oMessageViewERP : MessageView;
    private oDialogMessageERP : Dialog;

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.ZSD_SALES_GET_DOC_SRV = this.getOwnerComponent()?.getModel("ZSD_SALES_GET_DOC_SRV") as ODataModel;
        this.ZSD_SALES_CREATE_DOC_SRV_01 = this.getOwnerComponent()?.getModel("ZSD_SALES_CREATE_DOC_SRV_01") as ODataModel;
        this.ZSD_SALES_CHANGE_DOC_SRV = this.getOwnerComponent()?.getModel("ZSD_SALES_CHANGE_DOC_SRV") as ODataModel;
        this.oRouter = (this.getOwnerComponent() as UIComponent).getRouter();
        this.oI18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel;
        this.oI18n = this.oI18nModel.getResourceBundle() as ResourceBundle;
        this.oCreateOrderModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
        this.oRouter.getRoute("RouteDetailSalesOrder")?.attachMatched(this.onRouteMatched, this);
        this.oRouter.getRoute("RouteDetailEditSalesOrder")?.attachMatched(this.onRouteMatchedModify, this);
    }

    public onRouteMatchedGeneric(oArguments : DetailRouteArg): void {
        // const oArguments = oEvent.getParameter("arguments") as DetailRouteArg;
        const oQueryParams = oArguments["?query"];

        //Se asigna el valor al modelo para el escenario en que se entre directo en la ruta
        this.oCreateOrderModel.setProperty('/oQuery/iFactor', oQueryParams.factor);

        this.onQuerySalesOrder(oArguments?.estimationNumber);
        
    }

    public onRouteMatched(oEvent: Route$MatchedEvent): void {
        const oArguments = oEvent.getParameter("arguments") as DetailRouteArg;
        
        this.onRouteMatchedGeneric(oArguments);
        
    }

    public onRouteMatchedModify(oEvent: Route$MatchedEvent): void {
        const oArguments = oEvent.getParameter("arguments") as DetailRouteArg;
        
        this.oCreateOrderModel.setProperty('/bModify', true);
        this.onRouteMatchedGeneric(oArguments);
        
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
                oItem.TargetValCalculate = (oItem.NetValue * parseFloat(oQueryData.iFactor)).toFixed(2);
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
                oFindItemsTable.partition = oItemPartition.partition;
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
        EventBus.getInstance().publish("QueryModifyOrder", "clear");
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
        oSelectItem.ItmNumberFather = oSelectItem.ItmNumber;
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
            const oSelectItemByPartition : ItemOrder = structuredClone(oSelectItem);
            oSelectItemByPartition.NetValue = iNetValueByPartition.toFixed(2);
            oSelectItemByPartition.partition = true;
            let iLengthArrPartitionByItem = arrPartitionByItem.length;
            let iCalculatePosition  = 0;
            if (i !== 0)  {
                oSelectItemByPartition.ItmNumberFather = oSelectItemByPartition.ItmNumber;
                iCalculatePosition = (iLengthOrderItems + iLengthArrPartitionByItem) * 10;
                oSelectItemByPartition.ItmNumber = iCalculatePosition.toString().padStart(6,'0');
            }
            iCalculateModifiedValuePartititionByItem += Number(iNetValueByPartition.toFixed(2));
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

    public convertServicesToHierarchy2(arrServices: Service[]): Service[] {
        const oMapLevelsServices: Record<string, Service> = {};
        const arrRoots = [];
        for(const oPos of arrServices) {
            if(oPos.Service) continue;
            oPos.children = [];
            oMapLevelsServices[oPos.LineNo] = oPos;
        }

        for(const oPos of arrServices) {
            if((oPos.ExtLine !== "0000000000" && oPos.OutlLevel !== 0) || oPos.Service) {
                if(oPos.SubpckgNo !== "0000000000") {
                    const oChild = arrServices.filter(oService => oService.PckgNo === oPos.SubpckgNo);
                    oPos.children?.push(...oChild);
                }
                const oParent = oMapLevelsServices[oPos.ExtLine];
                if(oParent) oParent.children?.push(oPos);
            } else {
                arrRoots.push(oPos);
            }
        }
        return arrRoots;
    }
      
    // public restartPackageNumbersServicesHierarchy(
    //     arrOriginalServices: Service[], 
    //     pckgInicial: number, 
    //     subpckgInicial: number
    // ): {
    //     ultimoPckg: number, 
    //     ultimoSubpckg: number, 
    //     arr: Service[]
    // } {
    //     let iPackageCounter = pckgInicial;
    //     let iSubPackageCounter = subpckgInicial;

    //     function tranformPackageService(oService: Service, sParentSubpckg?: string): Service {
    //         const oNewService: Service = {
    //             ...oService,
    //             PckgNo: iPackageCounter.toString().padStart(10, '0'),
    //             SubpckgNo: oService.SubpckgNo === '0000000000' ? '0000000000' : iSubPackageCounter.toString().padStart(10, '0'),
    //         };

    //         if (oService.children && oService.children.length > 0)
    //             oNewService.children = oService.children.map(oChild => tranformPackageService(oChild, oNewService.SubpckgNo));

    //         if (oService.SubpckgNo !== '0000000000' && oService.children && oService.children.length > 0) 
    //             iSubPackageCounter++;
    //         if (oService.Service && !oService.children && sParentSubpckg) 
    //             oNewService.PckgNo = sParentSubpckg;

    //         return oNewService;
    //     }

    //     function findLastSubPackage(arrServices: Service[]): string | null {
    //         if (!arrServices || arrServices.length === 0) return null;

    //         for (let i = arrServices.length - 1; i >= 0; i--) {
    //             const oService = arrServices[i];
    //             if (oService.Service) {
    //                 if (oService.SubpckgNo !== "0000000000") return oService.SubpckgNo;
    //                 else return null;
    //             }

    //             if (oService.children && oService.children.length > 0) {
    //                 const resultadoRecursivo = findLastSubPackage(oService.children);
    //                 if (resultadoRecursivo) return resultadoRecursivo;
    //             }
    //             if (oService.SubpckgNo !== "0000000000") return oService.SubpckgNo;
    //         }
    //         return null;
    //     }

    //     let iLastSubPackage = subpckgInicial - 1;
    //     let iLastPackage = pckgInicial - 1;

    //     const arrResultServices = arrOriginalServices.map((oService, iIndex) => {
    //         if (iIndex > 0) {
    //             iPackageCounter = iLastSubPackage + 1;
    //             iSubPackageCounter = iLastSubPackage + 2;
    //         } else {
    //             iPackageCounter = pckgInicial;
    //             iSubPackageCounter = subpckgInicial;
    //         }

    //         const oTransformedService = tranformPackageService(oService);
    //         const sLastSubPackageFound = findLastSubPackage([oTransformedService]);
    //         iLastSubPackage = sLastSubPackageFound ? parseInt(sLastSubPackageFound, 10) : iLastSubPackage;
    //         iLastPackage = iPackageCounter;
    //         return oTransformedService;
    //     });

    //     return {
    //         ultimoPckg: iLastPackage, 
    //         ultimoSubpckg: iLastSubPackage, 
    //         arr: arrResultServices
    //     };
    // }

    public restartPackageNumbersServicesHierarchy(data: Service[], pckgInicial: number = 1, subpckgInicial: number = 2): {
        ultimoPckg: number,
        ultimoSubpckg: number,
        arregloAjustado: Service[]
    } {
        let contadorPckg = pckgInicial;
        let contadorSubpckg = subpckgInicial;

        function transformarItem(item: Service, padreSubpckg?: string): Service {
            const nuevoItem: Service = {
                ...item,
                PckgNo: contadorPckg.toString().padStart(10, '0'),
                SubpckgNo: item.SubpckgNo === '0000000000' ? '0000000000' : contadorSubpckg.toString().padStart(10, '0'),
            };

            if (item.children && item.children.length > 0) {
                nuevoItem.children = item.children.map(child => transformarItem(child, nuevoItem.SubpckgNo));
            }

            if (item.SubpckgNo !== '0000000000' && item.children && item.children.length > 0) {
                contadorSubpckg++;
            }

            if (item.Service && !item.children && padreSubpckg) {
                nuevoItem.PckgNo = padreSubpckg;
            }

            return nuevoItem;
        }

        function encontrarUltimoSubpckg(items: Service[]): string | null {
            if (!items || items.length === 0) {
                return null;
            }

            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i];
                if (item.Service) {
                    if (item.SubpckgNo !== "0000000000") {
                        return item.SubpckgNo;
                    } else {
                        return null;
                    }
                }

                if (item.children && item.children.length > 0) {
                    const resultadoRecursivo = encontrarUltimoSubpckg(item.children);
                    if (resultadoRecursivo) {
                        return resultadoRecursivo;
                    }
                }
                if (item.SubpckgNo !== "0000000000") {
                    return item.SubpckgNo;
                }
            }

            return null;
        }

        let ultimoSubpckg = subpckgInicial - 1;
        let ultimoPckg = pckgInicial - 1;

        const arregloAjustado = data.map((item, index) => {
            if (index > 0) {
                contadorPckg = ultimoSubpckg + 1;
                contadorSubpckg = ultimoSubpckg + 2;
            } else {
                contadorPckg = pckgInicial;
                contadorSubpckg = subpckgInicial;
            }

            const itemTransformado = transformarItem(item);
            const ultimoSubpckgEncontrado = encontrarUltimoSubpckg([itemTransformado]);
            ultimoSubpckg = ultimoSubpckgEncontrado ? parseInt(ultimoSubpckgEncontrado, 10) : ultimoSubpckg;
            ultimoPckg = contadorPckg;
            return itemTransformado;
        });

        return {
            arregloAjustado,
            ultimoPckg,
            ultimoSubpckg,
        };
    }

    public flattenServiceHierarchy(arrServices: Service[]): Service[] {
        const arrResultServices: Service[] = [];

        function traverse(node: Service): void {
            arrResultServices.push(node);
            if (node.children && node.children.length > 0) {
                node.children.forEach(traverse);
            }
            delete node.children; // Opcional: elimina la propiedad 'children' después de procesarla.
        }

        arrServices.forEach(traverse);
        return arrResultServices;
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
            let oJsonCreate = {
                SalesHeaderIn: this.getSalesHeader(),
                SalesItemsInSet: this.getSalesItemsInSet(),
                SalesPartnersSet: this.getSalesPartner(),
                ReturnSet: []
            };

            const { data: oResponse } = await ERP.createDataERP('/SalesHeaderSet', this.ZSD_SALES_CREATE_DOC_SRV_01,  oJsonCreate);

            this.onShowMessageERP(this.getTypeErrorMessageERP(oResponse.ReturnSet.results), () => {
                const oResDocument: MessageERP = oResponse.ReturnSet.results.find((oResult: MessageERP) => oResult.Type === "S" && oResult.Id === "V1");
                if(oResDocument) {
                    // MessageBox.success(this.oI18n.getText("succesCreateOreder", [oResDocument.MessageV2]) || '', {
                    //     closeOnNavigation: false
                    // });
                    this.onClose();
                }
            });            
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
            DocType: 'ZL6',//oSalesOrder.DocType,
            Currency: oSalesOrder.Currency,
            PurchNoC: '',//"sefsf", //no esta
            PurchDate: oSalesOrder.PurchDate,
            Ref1: oSalesOrder.Ref1, //no esta
            RefDoc: oSalesOrder.DocNumber,
            RefdocCat: 'L',
            CtValidF: oSalesOrder.CtValidF,//no esta
            CtValidT: oSalesOrder.CtValidT,//no esta
            PoDatS: null,//"\/Date(1738021010567)\/",//no esta
            SdDocCat: oSalesOrder.SdDocCat,
            CompCdeB: oSalesOrder.CompCode,
            CurrIso: oSalesOrder.CurrenIso
        };
        
        return oSalesHeader;
    }

    public getSalesItemsInSet () : SalesItemERP[] {
        const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
        const arrItems: ItemOrder[] = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToItems/results`);
        const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');
        
        let iCount = 1;
        let iCountSubPackage = 2;
        let arrSalesItems = [];

        for (const oItems of arrItems) {

            const serviceByItem : ServiceByItem = {
                iFactor: oQueryData.iFactor,
                iterator: iCount,
                interatorSubPackage: iCountSubPackage,
                sPackageNumber: oItems.PckgNo,
                partition: oItems.partition || false,
                NetValueItem: Number(oItems.NetValue) 
            };

            let oServiceByItem = this.getServicesByItem(serviceByItem);
            const sGrPrice = oServiceByItem.data.find(oService => Number(oService.GrPrice) !== 0)?.GrPrice ?? "0";
            
            const oSalesItem : SalesItemERP = {
                ItmNumber: oItems.ItmNumber,
                Material: oItems.Material,
                ShortText: oItems.ShortText, 
                Plant: oItems.Plant,
                TargetQty: oItems.TargetQty,
                TargetQu: oItems.TargetQu,
                TargetVal: oItems.TargetValCalculate.toString(),
                ItemCateg: '',//oItems.ItemCateg,
                MatlGroup: oItems.MatlGroup,
                PurchDate: oSalesOrder.PurchDate,
                Ref1: oSalesOrder.Ref1,
                RefDoc : oSalesOrder.DocNumber,
                RefDocIt : oItems.ItmNumber,
                RefDocCa : 'L',
                ProfitCtr : oItems.ProfitCtr,
                PckgNo : iCount.toString().padStart(10,'0'),
                WbsElem : oItems.WbsElem,
                Route : oItems.Route,
                PoDatS: null,//"\/Date(1738021010567)\/", //no esta
                SalesConditionsInSet: this.getConditionByItems(
                    oItems.ItmNumberFather || "" , 
                    oItems.ItmNumber, 
                    oItems.CondUnit,
                    sGrPrice
                ),
                SalesServicesSet: oServiceByItem.data
            }
            arrSalesItems.push(oSalesItem);
            iCount = oServiceByItem.interatorSubPackage + 1;
            iCountSubPackage = iCount + 1;
        }
        return arrSalesItems;
    }

    public getConditionByItems(
        itmNumberKeyFatherByItem : string, 
        itmNumberKeyChildByItem : string, 
        sCondUnit: string,
        sCondValue?: string
    ) : SalesItemConditionERP[]{
        
        const itmNumberKeyByItem : string = itmNumberKeyFatherByItem || itmNumberKeyChildByItem;
        const arrSalesConditions = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToConditions/results`);
        let arrFilterConditionByItems: ServicesConditions[] = arrSalesConditions.filter( 
            (oConditions : ServicesConditions) => oConditions.ItmNumber === itmNumberKeyByItem
        );
        let conditionByItems : SalesItemConditionERP[] = [];
        for (const oSalesConditions of arrFilterConditionByItems) {
            const sCondType = {
                ZEK1: "ZK1P",
                ZEK2: "ZK2P",
                ZEK3: "ZK3P",
                ZEK4: "ZK4P",
                ZEK5: "ZK5P",
            }[oSalesConditions.CondType] || '';

            if (sCondType === "" || oSalesConditions.Condvalue <= 0) continue; // para enviar solo las condition type con valor

            conditionByItems.push({
                ItmNumber: itmNumberKeyChildByItem,//oSalesConditions.ItmNumber,
                CondStNo: oSalesConditions.CondStNo,
                CondCount: oSalesConditions.CondCount,
                CondType: sCondType,
                CondValue: sCondValue ?? oSalesConditions.CondValue,
                Currency: oSalesConditions.Currency,
                CondUnit: sCondUnit,
                CondPUnt: oSalesConditions.CondPUnt,
                Calctypcon: oSalesConditions.Calctypcon,
                Conexchrat: oSalesConditions.Conexchrat,
                Numconvert: oSalesConditions.Numconvert,
                Denominato: oSalesConditions.Denominato,
                Accountkey: oSalesConditions.Accountkey,
                Condvalue : sCondValue ?? oSalesConditions.CondValue,
            });
        }
        return conditionByItems;
    }

    public getServicesByItem( {iFactor, sPackageNumber, iterator, interatorSubPackage, partition, NetValueItem}: ServiceByItem ) {
        const arrServices: Service[] = structuredClone(this.oCreateOrderModel.getProperty(`/oSalesOrder/ToServices/results`));

        const setSubPackages = new Set<string>();
        const arrFilteredServices = arrServices.filter(oService => {
            const bMatched = oService.PckgNo === sPackageNumber || setSubPackages.has(oService.PckgNo);
            oService.OutlInd = ''
            if(oService.PckgNo === sPackageNumber) oService.OutlInd = 'X';
            
            if(bMatched && oService.SubpckgNo !== "0000000000" && !setSubPackages.has(oService.SubpckgNo)) {
                setSubPackages.add(oService.SubpckgNo);
            }
            return bMatched;
        });

        const arrBaseServicesHierarchy = this.convertServicesToHierarchy2(arrFilteredServices);
        const {
            ultimoPckg,
            ultimoSubpckg,
            arregloAjustado: arrRestartedServicesHierarchy
        } = this.restartPackageNumbersServicesHierarchy(arrBaseServicesHierarchy, iterator, interatorSubPackage);
        const arrFlatternServicesHierarchy = this.flattenServiceHierarchy(arrRestartedServicesHierarchy);
        
        // const iGrPriceFromPartition = NetValueItem / arrFilteredServices.length;
        const iGrPriceFromPartition = NetValueItem / arrFlatternServicesHierarchy.length;
        const oInfoERP: SalesServicesERP[] = arrFlatternServicesHierarchy.map(oService => {
            const sGrPrice = partition ? iGrPriceFromPartition * iFactor : Number(oService.GrPrice) * iFactor;
            return {
                PckgNo: oService.PckgNo,
                LineNo: oService.LineNo,
                ExtLine: oService.ExtLine,
                OutlLevel: oService.OutlLevel,
                OutlNo: oService.OutlNo,
                OutlInd: oService.OutlInd,
                SubpckgNo: oService.SubpckgNo,
                Service: oService.Service,
                ExtServ: oService.ExtServ,
                Quantity: oService.Quantity,
                BaseUom: oService.BaseUom,
                UomIso: oService.UomIso,
                PriceUnit: oService.PriceUnit,
                GrPrice: sGrPrice.toString(),
                FromLine: oService.FromLine,
                ToLine: oService.ToLine,
                ShortText: oService.ShortText,
                Userf1Txt: oService.Userf1Txt,
                HiLineNo: oService.HiLineNo,
                Bosgrp: oService.Bosgrp
            };
        });

        return {
            iterator: ultimoPckg,
            interatorSubPackage: ultimoSubpckg,
            data: oInfoERP
        }
    }

    public getSalesPartner() : SalesPartnersERP[] {
        const arrSalesPartner = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToPartners/results`) as Partner[];
        let arrPartner: SalesPartnersERP[] = [];

        for (const oPartner of arrSalesPartner) {
            arrPartner.push({
                PartnRole: oPartner.PartnRole,
                PartnNumb: oPartner.Customer,
                ItmNumber: "",
                Name: "",
                Name2: "",
                Street:  "",
                Country: oPartner.Country,
                CountrIso: oPartner.Countryiso,
                PostlCode: "",
                City: "",
                Region: "",
                Telephone: "",
                Address:  oPartner.Address
            });
        }

        return arrPartner;
    }

    public getTypeErrorMessageERP(aMessageERP : MessageERP[]) : MessageERP[] {
        for (const oMessage of aMessageERP) {
            let  typeMessage : string;
            let  descMessage : string;
            switch (oMessage.Type) {
                case 'E':                    
                    typeMessage = this.oI18n.getText("error") || '';
                    descMessage = 'Error';
                    break;
                case 'S':                    
                    typeMessage = this.oI18n.getText("success") || '';
                    descMessage = 'Success';
                    break;
            
                default:
                    typeMessage = this.oI18n.getText("warning") || '';
                    descMessage = 'Warning';
                    break;
            }
            oMessage.typeMessage = typeMessage;
            oMessage.descMessage = descMessage;
        }
        return aMessageERP;
    }  

    public onShowMessageERP(aMessageERP : MessageERP[], onClose: Function = () => {}) : void {

        if(!this.oMessageViewERP){
            const oBntBackDialog = new Button({
                icon: "sap-icon://nav-back",
                visible: false,
                press: () =>{
                    this.oMessageViewERP.navigateBack();
                    oBntBackDialog.setVisible(false);
                }
            });

            this.oMessageViewERP = new MessageView({
                showDetailsPageHeader:false,
                itemSelect: () => oBntBackDialog.setVisible(true),
                items:{
                    path: '/',
                    template: new MessageItem({
                        type: '{descMessage}',
                        title: '{typeMessage}',
                        description: '{Message}',
                        subtitle: '{Message}'
                    })
                }
            });

            this.oDialogMessageERP = new Dialog({
                resizable: true,
                draggable: true,
                content:this.oMessageViewERP,
                state: "Information",
                icon: "sap-icon://information",
                beginButton: new Button({
                    press:  () => {
                        this.oDialogMessageERP.close();
                        onClose();
                    },
                    text: this.oI18n.getText("close")
                }),
                customHeader: new Bar({
                    contentLeft: [ oBntBackDialog ],
                    contentMiddle: [ new Title({text:this.oI18n.getText("messageERP")}) ]
                }),
                contentWidth: "50%",
                contentHeight: "40%",
                verticalScrolling: false
            });

            this.oMessageViewERP.setModel(new JSONModel(aMessageERP));
        }

        const oModel = this.oMessageViewERP.getModel() as JSONModel;
        oModel.setData(aMessageERP);

        this.oMessageViewERP.navigateBack();
        this.oDialogMessageERP.open();
    }

    public async onModifyOrder() : Promise<void> {
        try {
            BusyIndicator.show(0);
            const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
            const oJsonModify = {
                SalesDocument: oSalesOrder.DocNumber,
                OrderHeaderIn: this.getOrderHeaderIn(),
                SalesItemsInSet: this.getSalesItemsInSetModify(),
                ReturnSet: []
            };

            const { data: oResponse } = await ERP.createDataERP('/SalesHeaderSet', this.ZSD_SALES_CHANGE_DOC_SRV,  oJsonModify);

            this.onShowMessageERP(this.getTypeErrorMessageERP(oResponse.ReturnSet.results), () => {
                const oResDocument: MessageERP = oResponse.ReturnSet.results.find((oResult: MessageERP) => oResult.Type === "S" && oResult.Id === "V1");
                if(oResDocument) {
                    MessageBox.success(this.oI18n.getText("succesModifyOreder", [oResDocument.MessageV2]) || '');
                }
            });
            
        } catch (oError : any) {
            const sErrorMessageDefault = this.oI18n.getText("errorModifySalesOrder");
            MessageBox.error( oError.statusCode ? sErrorMessageDefault : oError.message);
        } finally {
            BusyIndicator.hide();
        }
    }

    public getOrderHeaderIn() : OrderHeaderInERP {
        const oSalesOrder = this.oCreateOrderModel.getProperty('/oSalesOrder');
        const oOrderHeaderIn : OrderHeaderInERP = {
            DistrChan: oSalesOrder.DistrChan,
            Division: oSalesOrder.Division,
            SalesOrg: oSalesOrder.SalesOrg
        }
        return oOrderHeaderIn;
    }

    public getSalesItemsInSetModify() : SalesItemsInERPModify[] {
        const arrItems: ItemOrder[] = this.oCreateOrderModel.getProperty(`/oSalesOrder/ToItems/results`);
        const oQueryData = this.oCreateOrderModel.getProperty('/oQuery');
        
        let arrSalesItems : SalesItemsInERPModify[]= [];
        let iCount = 1;
        let iCountSubPackage = 2;
        for (const oItems of arrItems) {

            const serviceByItem : ServiceByItem = {
                iFactor: oQueryData.iFactor,
                iterator: iCount,
                interatorSubPackage: iCountSubPackage,
                sPackageNumber: oItems.PckgNo,
                partition: false,
                NetValueItem: 0
            };

            let oServiceByItem = this.getServicesByItem(serviceByItem);
            const oSalesItem : SalesItemsInERPModify = {
                ItmNumber: oItems.ItmNumber,
                Material: oItems.Material,
                TargetQty: oItems.TargetQty,
                SalesConditionsInSet: this.getConditionByItems(
                    oItems.ItmNumberFather || "" , 
                    oItems.ItmNumber, 
                    oItems.CondUnit
                ),
                SalesServicesInSet: oServiceByItem.data
            }
            arrSalesItems.push(oSalesItem);
            iCount = oServiceByItem.iterator;
            iCountSubPackage = oServiceByItem.interatorSubPackage;
        }
        return arrSalesItems;
    }
}