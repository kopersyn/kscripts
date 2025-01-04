// ---------- kAdvStarStretch Script ----------
// This script helps with stretching stars.
// part of • kScript Bundle •
// made with love by Igor Koprowicz (koperson)
// check out my astrobin https://www.astrobin.com/users/koperson/
// ---------------------------------------------

// WORKS BEST WITH 1.9 AND HIGHER VERSIONS OF PIXINSIGHT

#feature-id kAdvStarStretch : kScripts Bundle > kAdvStarStretch
#feature-info Advanced Star Stretch script
#feature-icon kAdvStarStretch.svg
#define TITLE "kAdvStarStretch"
#define VERSION "1.1"

#include <pjsr/Sizer.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/StdCursor.jsh>

var SParameters = {
  targetView: undefined,
  histogram: 0,
  arcsinh: 1,
  scnr: 0,
  base: 0.05,
  previewImage: null,
  tempWindows: []
};

Console.show();
Console.noteln("<br>Successfully loaded kAdvStarStretch V", VERSION, "!<br>");

function ScrollControl(parent) {
    this.__base__ = ScrollBox;
    this.__base__(parent);

    this.autoScroll = true;
    this.tracking = true;

    this.displayImage = null;
    this.dragging = false;
    this.dragOrigin = new Point(0);
    this.zoomFactor = 0.2;
    this.minZoomFactor = 0.1;
    this.maxZoomFactor = 10.0;

    this.viewport.cursor = new Cursor(StdCursor_OpenHand);

    this.getImage = function() {
        return this.displayImage;
    };

    this.doUpdateImage = function(image) {
        this.displayImage = image;
        this.initScrollBars();
        this.viewport.update();
    };

    this.initScrollBars = function() {
        var image = this.getImage();
        if (image == null || image.width <= 0 || image.height <= 0) {
            this.setHorizontalScrollRange(0, 0);
            this.setVerticalScrollRange(0, 0);
        } else {
            var zoomedWidth = image.width * this.zoomFactor;
            var zoomedHeight = image.height * this.zoomFactor;

            this.setHorizontalScrollRange(0, Math.max(0, zoomedWidth - this.viewport.width));
            this.setVerticalScrollRange(0, Math.max(0, zoomedHeight - this.viewport.height));
        }
        this.viewport.update();
    };

    this.viewport.onResize = function() {
        this.parent.initScrollBars();
    };

    this.onHorizontalScrollPosUpdated = function(x) {
        this.viewport.update();
    };

    this.onVerticalScrollPosUpdated = function(y) {
        this.viewport.update();
    };

    this.viewport.onMousePress = function(x, y, button, buttons, modifiers) {
        this.cursor = new Cursor(StdCursor_ClosedHand);
        with (this.parent) {
            dragOrigin.x = x;
            dragOrigin.y = y;
            dragging = true;
        }
    };

    this.viewport.onMouseMove = function(x, y, buttons, modifiers) {
        with (this.parent) {
            if (dragging) {
                scrollPosition = new Point(scrollPosition).translatedBy(dragOrigin.x - x, dragOrigin.y - y);
                dragOrigin.x = x;
                dragOrigin.y = y;
            }
        }
    };

    this.viewport.onMouseRelease = function(x, y, button, buttons, modifiers) {
        this.cursor = new Cursor(StdCursor_OpenHand);
        this.parent.dragging = false;
    };

    this.viewport.onMouseWheel = function(x, y, delta) {
        const parent = this.parent;
        const oldZoomFactor = parent.zoomFactor;

        if (delta > 0) {
            parent.zoomFactor = Math.min(parent.zoomFactor * 1.25, parent.maxZoomFactor);
        } else if (delta < 0) {
            parent.zoomFactor = Math.max(parent.zoomFactor * 0.8, parent.minZoomFactor);
        }

        const zoomRatio = parent.zoomFactor / oldZoomFactor;

        parent.scrollPosition = new Point(
            (parent.scrollPosition.x + x) * zoomRatio - x,
            (parent.scrollPosition.y + y) * zoomRatio - y
        );

        parent.initScrollBars();
        this.update();
    };

    this.viewport.onPaint = function(x0, y0, x1, y1) {
        var g = new Graphics(this);
        var result = this.parent.getImage();
        if (result == null) {
            g.fillRect(x0, y0, x1, y1, new Brush(0xff000000));
        } else {
            g.scaleTransformation(this.parent.zoomFactor);
            g.translateTransformation(-this.parent.scrollPosition.x, -this.parent.scrollPosition.y);
            g.drawBitmap(0, 0, result.render());
        }
        g.end();
        gc();
    };

    this.initScrollBars();
}
ScrollControl.prototype = new ScrollBox;

function applyStretch(view, arcsinh, histogram, base) {
   let P001 = new HistogramTransformation;
    P001.H = [ // c0, m, c1, r0, r1
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, base, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
    ];
    P001.executeOn(view);

    let P002 = new HistogramTransformation;
    P002.H = [ // c0, m, c1, r0, r1
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000-histogram, 1.00000000, 0.00000000, 1.00000000],
        [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
    ];
    P002.executeOn(view);

    let P003 = new ArcsinhStretch;
    P003.stretch = arcsinh*2.5;
    P003.blackPoint = 0.000000;
    P003.protectHighlights = false;
    P003.useRGBWS = false;
    P003.executeOn(view);
}

function greenRemoval(view, scnr){
  let P003 = new SCNR;
  P003.amount = 1.00;
  P003.protectionMethod = SCNR.prototype.AverageNeutral;
  P003.colorToRemove = SCNR.prototype.Green;
  P003.preserveLightness = true;
  P003.executeOn(view);
}

function sDialog() {
    this.__base__ = Dialog;
    this.__base__();

    this.windowTitle = "kScripts - kAdvStarStretch";
    this.scaledMinWidth = 600;
    this.scaledMinHeight = 600;
    this.setFixedSize(900, 450);

    this.titleBox = new Label(this);
    this.titleBox.text = "kAdvStarStretch " + VERSION;
    this.titleBox.textAlignment = TextAlign_Center;
    this.titleBox.styleSheet = "font-weight: bold; font-size: 14pt; background-color: #d7e7fa; border: 1px solid #ccc;";
    this.titleBox.setFixedHeight(30);

    this.instructionsBox = new Label(this);
    this.instructionsBox.text = "Use linear state images.\nAt first set best base stretch for your stars. Then play around with\nrest of the settings to get best result possible :)";
    this.instructionsBox.textAlignment = TextAlign_Center;
    this.instructionsBox.styleSheet = "font-size: 8pt; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;";
    this.instructionsBox.setFixedHeight(65);

    this.viewListLabel = new Label(this);
    this.viewListLabel.text = "Stars Image:";

    this.viewList = new ViewList(this);
    this.viewList.getMainViews();
    this.viewList.onViewSelected = function(view) {
        SParameters.targetView = view;
        Console.write("Stars Image Selected: " + view.id);
    };

    this.baseCombo = new ComboBox(this);
    this.baseCombo.addItem("0.05");
    this.baseCombo.addItem("0.10");
    this.baseCombo.addItem("0.25");
    this.baseCombo.addItem("0.50");
    this.baseCombo.currentItem = 2;
    this.baseCombo.toolTip = "Select base stretch value, lower value = stronger stretch";
    this.baseCombo.onItemSelected = function(index) {
      SParameters.base = parseFloat(this.itemText(index));
      if (SParameters.targetView){
        this.dialog.updatePreview();
      }
        Console.writeln("Base stretch: "+SParameters.base);
    };

    this.baseLabel = new Label(this);
    this.baseLabel.text = "Base Stretch:";
    this.baseLabel.textAlignment = TextAlign_Left;

    this.histogram_control = new NumericControl(this);
    this.histogram_control.label.text = "Histogram Stretch:";
    this.histogram_control.setRange(0, 0.5);
    this.histogram_control.setValue(0.1);
    this.histogram_control.setPrecision(2);
    this.histogram_control.slider.setRange(1, 500);
    this.histogram_control.setValue(SParameters.histogram);
    this.histogram_control.onValueUpdated = function(value) {
        SParameters.histogram = value;
    };

    this.arcsinh_control = new NumericControl(this);
    this.arcsinh_control.label.text = "Arcsinh Stretch:";
    this.arcsinh_control.setRange(1, 10);
    this.arcsinh_control.setValue(0.1);
    this.arcsinh_control.setPrecision(2);
    this.arcsinh_control.slider.setRange(1, 500);
    this.arcsinh_control.setValue(SParameters.arcsinh);
    this.arcsinh_control.onValueUpdated = function(value) {
        SParameters.arcsinh = value;
    };

    this.optionalLabel = new Label(this);
    this.optionalLabel.text = "Optional:";
    this.optionalLabel.textAlignment = TextAlign_Left;
    this.optionalLabel.styleSheet = "font-weight: bold; font-size: 8pt;";

    this.scnrCheckbox = new CheckBox(this);
    this.scnrCheckbox.text = "Green Removal";
    this.scnrCheckbox.checked = false;
    this.scnrCheckbox.toolTip = "<p>Check this box to remove green color from the result.</p>";
    this.scnrCheckbox.onClick = function() {
        SParameters.scnr = this.checked ? 1 : 0;
        if(SParameters.scnr==1){
          Console.writeln("Green Removal activated.<br>");
        } else {
          Console.writeln("Green Removal deactivated.<br>");
        }

    };

    this.authorshipLabel = new Label(this);
    this.authorshipLabel.text = "Written by Igor Koprowicz\n© Copyright 2025";
    this.authorshipLabel.textAlignment = TextAlign_Center;

    this.executeButton = new PushButton(this);
    this.executeButton.text = "Execute";
    this.executeButton.onClick = () => {
        this.ok();
    }
    this.executeButton.setFixedHeight(25);

    this.mainSizer = new HorizontalSizer();
    this.mainSizer.margin = 20;

    this.previewControl = new ScrollControl(this);
    this.previewControl.setFixedSize(400, 400);
    this.previewControl.scrollBarsVisible = false;

    this.applyStretch = function(view){
      let P001 = new HistogramTransformation;
       P001.H = [ // c0, m, c1, r0, r1
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, SParameters.base, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
       ];
       P001.executeOn(view);

       let P002 = new HistogramTransformation;
       P002.H = [ // c0, m, c1, r0, r1
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000-SParameters.histogram, 1.00000000, 0.00000000, 1.00000000],
           [0.00000000, 0.50000000, 1.00000000, 0.00000000, 1.00000000]
       ];
       P002.executeOn(view);

       let P003 = new ArcsinhStretch;
       P003.stretch = SParameters.arcsinh*2.5;
       P003.blackPoint = 0.000000;
       P003.protectHighlights = false;
       P003.useRGBWS = false;
       P003.executeOn(view);
    }

    this.greenRemoval = function(view){
      let P003 = new SCNR;
      P003.amount = 1.00;
      P003.protectionMethod = SCNR.prototype.AverageNeutral;
      P003.colorToRemove = SCNR.prototype.Green;
      P003.preserveLightness = true;
      P003.executeOn(view);
    }

    this.updatePreview = function() {
        if (!SParameters.targetView || !SParameters.targetView.image) {
            Console.criticalln("No image available for preview.");
            return;
        }

        Console.noteln("Updating preview...");

        try {
            let tempImage = new Image(SParameters.targetView.image.width, SParameters.targetView.image.height,
                                      SParameters.targetView.image.numberOfChannels);

            tempImage.assign(SParameters.targetView.image);

            let window = new ImageWindow(tempImage.width, tempImage.height, tempImage.numberOfChannels,
                                         tempImage.bitsPerSample, tempImage.isReal, tempImage.isColor);

            SParameters.tempWindows.push(window.mainView.id);

            let tempView = window.mainView;

            let P = new PixelMath();
            P.expression = SParameters.targetView.fullId;
            P.useSingleExpression = true;
            P.createNewImage = false;
            P.showNewImage = true;
            P.executeOn(tempView);

            this.applyStretch(tempView);

            if(SParameters.scnr == 1){
              this.greenRemoval(tempView);
            }

            let P_resample = new IntegerResample();
            const previewWidth = this.previewControl.width;
            const widthScale = Math.floor(tempImage.width / previewWidth);
            P_resample.zoomFactor = 1;
            P_resample.executeOn(tempView);

            this.previewControl.displayImage = tempView.image;
            this.previewControl.doUpdateImage(tempView.image);
            this.previewControl.initScrollBars();

            Console.noteln("Preview updated successfully.");

        } catch (error) {
            Console.criticalln("Error in preview update: " + error.message);
        }
    };

    this.refreshPreviewButton = new PushButton(this);
    this.refreshPreviewButton.text = "Refresh Preview";
    this.refreshPreviewButton.onClick = () => {
        if (SParameters.targetView) {
            this.updatePreview();
        } else {
            Console.criticalln("Select image before refreshing preview.");
        }
    };
    this.refreshPreviewButton.setFixedHeight(25);

    this.zoomInButton = new PushButton(this);
    this.zoomInButton.text = "Zoom In";
    this.zoomInButton.onClick = () => {
        this.previewControl.zoomFactor = Math.min(this.previewControl.zoomFactor * 1.25, this.previewControl.maxZoomFactor);
        this.previewControl.initScrollBars();
        this.previewControl.viewport.update();
    };

    this.zoomOutButton = new PushButton(this);
    this.zoomOutButton.text = "Zoom Out";
    this.zoomOutButton.onClick = () => {
        this.previewControl.zoomFactor = Math.max(this.previewControl.zoomFactor * 0.8, this.previewControl.minZoomFactor);
        this.previewControl.initScrollBars();
        this.previewControl.viewport.update();
    };

    this.viewList.onViewSelected = function(view) {
        SParameters.targetView = view;
        Console.writeln("Stars Image Selected: " + view.id);
        this.dialog.updatePreview();
    }.bind(this);

    let viewSizer = new VerticalSizer();
    viewSizer.add(this.viewListLabel);
    viewSizer.addSpacing(3);
    viewSizer.add(this.viewList);

    let baseSizer = new VerticalSizer();
    baseSizer.add(this.baseLabel);
    baseSizer.addSpacing(3);
    baseSizer.add(this.baseCombo);

    let firstSizer = new HorizontalSizer();
    firstSizer.add(viewSizer);
    firstSizer.addSpacing(30);
    firstSizer.add(baseSizer);

    let buttonSizer = new HorizontalSizer();
    buttonSizer.add(this.refreshPreviewButton);
    buttonSizer.addSpacing(10);
    buttonSizer.add(this.executeButton);

    let optionalSizer = new HorizontalSizer();
    optionalSizer.add(this.scnrCheckbox);

    let leftSizer = new VerticalSizer();
    leftSizer.spacing = 4;
    leftSizer.margin = 8;
    leftSizer.add(this.titleBox);
    leftSizer.addSpacing(5);
    leftSizer.add(this.instructionsBox);
    leftSizer.addSpacing(10);
    leftSizer.add(firstSizer);
    leftSizer.addSpacing(3);
    leftSizer.add(this.histogram_control);
    leftSizer.addSpacing(3);
    leftSizer.add(this.arcsinh_control);
    leftSizer.addSpacing(20);
    leftSizer.add(this.optionalLabel);
    leftSizer.addSpacing(3);
    leftSizer.add(optionalSizer);
    leftSizer.addStretch();
    leftSizer.addSpacing(5);
    leftSizer.add(buttonSizer);
    leftSizer.addSpacing(10);
    leftSizer.add(this.authorshipLabel, 0);
    leftSizer.addSpacing(8);

    let zoomSizer = new HorizontalSizer();
    zoomSizer.add(this.zoomInButton);
    zoomSizer.addSpacing(5);
    zoomSizer.add(this.zoomOutButton);

    let previewSizer = new VerticalSizer();
    previewSizer.margin = 8;
    previewSizer.spacing = 4;
    previewSizer.addStretch();
    previewSizer.addSpacing(3);
    previewSizer.add(zoomSizer);
    previewSizer.add(this.previewControl);
    previewSizer.addSpacing(10);
    previewSizer.addStretch();

    this.mainSizer = new HorizontalSizer();
    this.mainSizer.margin = 8;
    this.mainSizer.spacing = 8;
    this.mainSizer.add(leftSizer);
    this.mainSizer.addSpacing(5);
    this.mainSizer.add(previewSizer);

    this.sizer = this.mainSizer;
}

sDialog.prototype = new Dialog;

function showDialog() {
    let dialog = new sDialog();
    return dialog.execute();
}

function closeTemp() {
    for (let i = 0; i < SParameters.tempWindows.length; i++) {
        let window = ImageWindow.windowById(SParameters.tempWindows[i]);
        if (window !== null) {
            window.forceClose();
        }
    }
    SParameters.tempWindows = [];
}

function disableSTF(targetView) {
    var stf = new ScreenTransferFunction;

    var stfParams = [ // c0, c1, m, r0, r1
        [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
        [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
        [0.00000, 1.00000, 0.50000, 0.00000, 1.00000],
        [0.00000, 1.00000, 0.50000, 0.00000, 1.00000]
    ];

    stf.STF = stfParams;
    stf.executeOn(targetView, false);

    console.warningln("STF has been disabled.");
}

function main() {
    let dialog = new sDialog();
    let retVal = dialog.execute();
    Console.show();

    if (retVal == 1) {
        if (!SParameters.targetView) {
            Console.criticalln("!!! Error: Stars image must be selected. !!!");
            return;
        }
        disableSTF(SParameters.targetView);
        applyStretch(SParameters.targetView, SParameters.arcsinh, SParameters.histogram);
        if(SParameters.scnr == 1){
          greenRemoval(SParameters.targetView);
        }
        closeTemp();
        Console.noteln("Successfully stretched stars.");
        processEvents();
    } else {
        Console.criticalln("Canceled.");
        closeTemp();
    }
}

main();
