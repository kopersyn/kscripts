// ---------- kStarRepair Script ----------
// star repair and combine with starless script for PixInsight
// part of • kScript Bundle •
// made with love by Igor Koprowicz (koperson)
// check out my astrobin https://www.astrobin.com/users/koperson/
// --------------------------------------

// WORKS BEST WITH 1.9 AND HIGHER VERSIONS OF PIXINSIGHT

#feature-id kStarRepair : kScripts Bundle > kStarRepair
#feature-info Star repair and combine script
#feature-icon kStarRepair.svg
#define TITLE "kStarRepair"
#define VERSION "0.6.1"

#include <pjsr/Sizer.jsh>
#include <pjsr/NumericControl.jsh>

var SRParameters = {
  targetView: undefined,
  targetView2: undefined,
  satAmount: 1,
  replace: 0,
  blendMode: "Screen",
  saturationLevel: [
    [0.00000, 0.40000],
    [0.50000, 0.70000],
    [1.00000, 0.40000]
  ],

  updateSaturationLevel: function() {
    var satAmount = SRParameters.satAmount;
    SRParameters.saturationLevel = [
      [0.00000, satAmount * 0.40000],
      [0.50000, satAmount * 0.70000],
      [1.00000, satAmount * 0.40000]
    ];
  }
};

console.noteln("<br>Successfully loaded kStarRepair V", VERSION, "!<br>");

function krDialog() {
    this.__base__ = Dialog;
    this.__base__();

    this.windowTitle = "kScripts - kStarRepair";

    // scaling
    this.scaledMinWidth = 400;

    // Title sizer
    this.titleSizer = new VerticalSizer;
    this.titleSizer.spacing = 4;

    this.titleBox = new Label(this);
    this.titleBox.text = "kStarRepair " + VERSION;
    this.titleBox.textAlignment = TextAlign_Center;
    this.titleBox.styleSheet = "font-weight: bold; font-size: 14pt; background-color: #d7e7fa; border: 1px solid #ccc;";
    this.titleBox.setFixedHeight(30);

    this.instructionsBox = new Label(this);
    this.instructionsBox.text = "Script that repairs star color and mixes starless with stars.";
    this.instructionsBox.textAlignment = TextAlign_Center;
    this.instructionsBox.styleSheet = "font-size: 8pt; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;";
    this.instructionsBox.setFixedHeight(40);

    this.titleSizer.add(this.titleBox);
    this.titleSizer.addSpacing(5);
    this.titleSizer.add(this.instructionsBox);
    this.titleSizer.addSpacing(5);

    this.viewListLabel = new Label(this);
    this.viewListLabel.text = "Starless image";

    this.viewList2Label = new Label(this);
    this.viewList2Label.text = "Stars image";

    this.viewList = new ViewList(this);
    this.viewList.getMainViews();
    this.viewList.onViewSelected = function(view) {
        SRParameters.targetView = view;
    };

    this.viewList2 = new ViewList(this);
    this.viewList2.getMainViews();
    this.viewList2.onViewSelected = function(view2) {
        SRParameters.targetView2 = view2;
    };

    let horizontalSizer = new HorizontalSizer();
    horizontalSizer.spacing = 10;

    this.boostCtrl = new NumericControl(this);
    this.boostCtrl.label.text = "Color boost";
    this.boostCtrl.setRange(0, 5);
    this.boostCtrl.setPrecision(1);
    this.boostCtrl.setValue(SRParameters.satAmount);
    this.boostCtrl.toolTip = "<p>Adjust the color saturation amount.</p>";
    this.boostCtrl.onValueUpdated = function(value) {
        SRParameters.satAmount = value;
        SRParameters.updateSaturationLevel();
    };

    this.blendModeCombo = new ComboBox(this);
    this.blendModeCombo.addItem("Screen");
    this.blendModeCombo.addItem("Addition");
    this.blendModeCombo.toolTip = "<p>Select the blending mode.</p>";
    this.blendModeCombo.onItemSelected = function(index) {
        SRParameters.blendMode = this.itemText(index);
    };

    this.replaceCheckbox = new CheckBox(this);
    this.replaceCheckbox.text = "Replace to original?";
    this.replaceCheckbox.checked = false;
    this.replaceCheckbox.toolTip = "<p>Check this box to replace the result with the original image.</p>";
    this.replaceCheckbox.onClick = function() {
        SRParameters.replace = this.checked ? 1 : 0;
    };

    horizontalSizer.add(this.boostCtrl);
    horizontalSizer.add(this.blendModeCombo);

    this.authorshipLabel = new Label(this);
    this.authorshipLabel.text = "Written by Igor Koprowicz\n© Copyright 2024-2025";
    this.authorshipLabel.textAlignment = TextAlign_Center;

    this.executeButton = new PushButton(this);
    this.executeButton.text = "Execute";
    this.executeButton.onClick = () => {
        this.ok();
    };

    this.sizer = new VerticalSizer();
    this.sizer.margin = 20;
    this.sizer.addStretch();
    this.sizer.add(this.titleSizer);
    this.sizer.addSpacing(7);
    this.sizer.add(this.viewListLabel);
    this.sizer.addSpacing(5);
    this.sizer.add(this.viewList);
    this.sizer.addSpacing(10);
    this.sizer.add(this.viewList2Label);
    this.sizer.addSpacing(5);
    this.sizer.add(this.viewList2);
    this.sizer.addSpacing(10);
    this.sizer.add(horizontalSizer);
    this.sizer.addSpacing(5);
    this.sizer.add(this.replaceCheckbox);
    this.sizer.addSpacing(10);
    this.sizer.add(this.authorshipLabel);
    this.sizer.addSpacing(10);
    this.sizer.add(this.executeButton);
}

krDialog.prototype = new Dialog;

function applyColorSaturation(view2) {
   var PCS = new ColorSaturation;
   PCS.HS = SRParameters.saturationLevel;
   PCS.HSt = ColorSaturation.prototype.AkimaSubsplines;
   PCS.hueShift = 0.000;
   PCS.executeOn(view2);
}

function applyStarRepair(view2) {
  var PSCNR = new SCNR;
  PSCNR.amount = 1.00;
  PSCNR.protectionMethod = SCNR.prototype.AverageNeutral;
  PSCNR.colorToRemove = SCNR.prototype.Green;
  PSCNR.preserveLightness = true;
  PSCNR.executeOn(view2);

  var invert1 = new Invert;
  invert1.executeOn(view2);

  var PSCNR2 = new SCNR;
  PSCNR2.amount = 1.00;
  PSCNR2.protectionMethod = SCNR.prototype.AverageNeutral;
  PSCNR2.colorToRemove = SCNR.prototype.Green;
  PSCNR2.preserveLightness = true;
  PSCNR2.executeOn(view2);

  var invert2 = new Invert;
  invert2.executeOn(view2);
}

function combineViews(view, view2) {
    var P001 = new PixelMath;
    if (SRParameters.blendMode === "Screen") {
        P001.expression = "combine(" + view2.id + "," + view.id + ",op_screen())";
    } else if (SRParameters.blendMode === "Addition") {
        P001.expression = view.id + " + " + view2.id;
    }
    P001.expression1 = "";
    P001.expression2 = "";
    P001.expression3 = "";
    P001.useSingleExpression = true;
    P001.symbols = "";
    P001.clearImageCacheAndExit = false;
    P001.cacheGeneratedImages = false;
    P001.generateOutput = true;
    P001.singleThreaded = false;
    P001.optimization = true;
    P001.use64BitWorkingImage = false;
    P001.rescale = false;
    P001.rescaleLower = 0;
    P001.rescaleUpper = 1;
    P001.truncate = true;
    P001.truncateLower = 0;
    P001.truncateUpper = 1;
    if(SRParameters.replace == 0){
      P001.createNewImage = true;
      P001.showNewImage = true;
      P001.newImageId = "Combined";
    } else if(SRParameters.replace == 1){
      P001.createNewImage = false;
    }
    P001.newImageWidth = 0;
    P001.newImageHeight = 0;
    P001.newImageAlpha = false;
    P001.newImageColorSpace = PixelMath.prototype.SameAsTarget;
    P001.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
    P001.executeOn(view);
}

function showDialog() {
    var dialog = new krDialog();
    return dialog.execute();
}

function main() {
    let retVal = showDialog();

    if(retVal){
      if (SRParameters.targetView == undefined && SRParameters.targetView2 == undefined) {
        console.criticalln("!!! You haven't chosen any view !!!")
      } else if (SRParameters.targetView == undefined || SRParameters.targetView2 == undefined) {
        console.criticalln("!!! You need to choose second view !!!")
      } else {
          applyColorSaturation(SRParameters.targetView2);
          applyStarRepair(SRParameters.targetView2);
          combineViews(SRParameters.targetView, SRParameters.targetView2);
          console.noteln("Successfully repaired stars!")
        }
    } else {
      console.criticalln("Canceled repairing.")
    }
}

main();
