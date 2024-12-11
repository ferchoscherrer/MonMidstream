import Dialog from "sap/m/Dialog";
import MessageToast from "sap/m/MessageToast";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table, { Table$RowSelectionChangeEvent } from "sap/ui/table/Table";
import MessageBox from "sap/m/MessageBox";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import { Table$SelectionChangeEvent } from "sap/ui/mdc/Table";
import Context from "sap/ui/model/Context";


/**
 * @namespace com.triiari.retrobilling.controller
 */
export default class DetailSalesDocument extends Controller {

    private oFragmentPositionPartitioning: Dialog | undefined;
    private oInfoTemp: JSONModel;
    private oI18nModel: ResourceModel;
    private oI18n: ResourceBundle;
    private oCreateOrderModel: JSONModel;


    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {

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
        MessageToast.show("Particinado papu");
        this.onClosenPositionPartitioning();
    }

    public onClosenPositionPartitioning() {
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
    }

    public removeSelectedPositions() {
        const oTblSalesDocument = this.byId("tblItemsSaleDocument") as Table;
        const arrItemsTable = this.oCreateOrderModel.getProperty('/oDetailSalesDocument/items');
        const arrSelectedIndices = oTblSalesDocument.getSelectedIndices();
        const arrPurgedItems = [];

        for(let i = 0; i < arrItemsTable.length; i++) {
            if(arrSelectedIndices.includes(i)){
                oTblSalesDocument.removeSelectionInterval(i, i);
                continue;
            }
            arrPurgedItems.push(arrItemsTable[i]);
        }

        this.oCreateOrderModel.setProperty('/oDetailSalesDocument/items', arrPurgedItems);
    }

    public onConfirmRemovePosition(): void {
        MessageBox.warning(this.oI18n.getText('confirmRemovePosition') || '', {
            actions: [this.oI18n.getText('not') || '', this.oI18n.getText('yes') || ''],
            emphasizedAction: this.oI18n.getText('yes'),
            onClose: (sAction: string) => {
                if (sAction !== this.oI18n.getText('yes')) return;

                this.removeSelectedPositions();
            },
            dependentOn: this.getView()
        });
    }

    // public getContextsBySelectedIndicesTable(oTable: Table): Context[] {
    //     const arrSelectRows = oTable.getSelectedIndices();
    //     let arrContextByIndex: Context[] = [];

    //     for (const iIndex of arrSelectRows) {
    //         const oContext = oTable.getContextByIndex(iIndex);
    //         if (!oContext) continue;
    //         arrContextByIndex.push(oContext);
    //     }
    //     return arrContextByIndex;
    // }

    // public removeDataTable(arrModelTable: [], arrContexIndexByTable: Context[]) {
    //     let arrItmNumber: number[] = [];
    //     for (const oContext of arrContexIndexByTable) {
    //         const sPath = oContext.getPath();
    //         const oInfoData = this.oCreateOrderModel.getProperty(sPath);
    //         arrItmNumber.push(oInfoData.ItmNumber);

    //     }

    //     debugger
    //     for (const iItmNumber of arrItmNumber) {
    //         const indexToDelete = arrModelTable.findIndex(oData => oData.ItmNumber === iItmNumber);
    //         arrModelTable.splice(indexToDelete, 1);
    //     }

    //     this.oCreateOrderModel.refresh(true);
    // }
}