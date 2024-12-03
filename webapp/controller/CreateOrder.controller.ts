import Dialog from "sap/m/Dialog";
import { SelectDialog$SearchEvent } from "sap/m/SelectDialog";
import Fragment from "sap/ui/core/Fragment";
import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace com.triiari.retrobilling.controller
 */
export default class CreateOrder extends Controller {
    private oMainModel: JSONModel;
    private oFragmentStimateNumber: Dialog;

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {
        this.oMainModel = this.getOwnerComponent()?.getModel("mCreateOrder") as JSONModel;
    }

    public async onOpenPopUpStimateNumber(): Promise<void> {
        this.oFragmentStimateNumber ??= await Fragment.load({
            id: this.getView()?.getId(),
            name: "com.triiari.retrobilling.view.fragment.SelectDialogStimateNumber",
            controller: this,
        }) as Dialog;

        this.oFragmentStimateNumber.open();
    }

    public onSearchListStimateNumber(oEvent: SelectDialog$SearchEvent): void {
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
}