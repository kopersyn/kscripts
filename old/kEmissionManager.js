// ---------- kEmissionManager Script ----------
// This script manages the processing of emission images for PixInsight
// part of • kScript Bundle •
// made with love by Igor Koprowicz (koperson)
// check out my astrobin https://www.astrobin.com/users/koperson/
// ---------------------------------------------

// WORKS BEST WITH 1.9 AND HIGHER VERSIONS OF PIXINSIGHT

#feature-id kEmissionManager : kScripts Bundle > kEmissionManager
#feature-info Emission Manager script
#feature-icon kEmissionManager.svg
#define TITLE "kEmissionManager"
#define VERSION "1.1.2"

#include <pjsr/Sizer.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/StdCursor.jsh>

var EMParameters = {
    targetViewBB: undefined,
    targetViewNB: undefined,
    f_r: 0,
    f_g: 0,
    f_b: 0,
    isLinked: 1,
    previewImage: null,
    tempWindows: []
};

Console.show();
Console.noteln("<br>Successfully loaded kEmissionManager V", VERSION, "!<br>");

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

function emDialog() {
    this.__base__ = Dialog;
    this.__base__();

    this.windowTitle = "kScripts - kEmissionManager";
    this.scaledMinWidth = 600;
    this.scaledMinHeight = 600;
    this.setFixedSize(1100, 500);

    this.titleBox = new Label(this);
    this.titleBox.text = "kEmissionManager " + VERSION;
    this.titleBox.textAlignment = TextAlign_Center;
    this.titleBox.styleSheet = "font-weight: bold; font-size: 14pt; background-color: #d7e7fa; border: 1px solid #ccc;";
    this.titleBox.setFixedHeight(30);

    this.instructionsBox = new Label(this);
    this.instructionsBox.text = "Select your images from dropdowns.\nUse linear state images for best results.\nBroadband image should be RGB, but narrowband should be in grayscale.\nChange R channel to remove Ha signal from image (higher=less signal)\nG and B channel for removing Oiii signal.";
    this.instructionsBox.textAlignment = TextAlign_Center;
    this.instructionsBox.styleSheet = "font-size: 8pt; padding: 10px; background-color: #f0f0f0; border: 1px solid #ccc;";
    this.instructionsBox.setFixedHeight(90);

    this.viewListLabelBB = new Label(this);
    this.viewListLabelBB.text = "Broadband Image:";

    this.viewListLabelNB = new Label(this);
    this.viewListLabelNB.text = "Narrowband Image:";

    this.viewListBB = new ViewList(this);
    this.viewListBB.getMainViews();
    this.viewListBB.onViewSelected = function(view) {
        EMParameters.targetViewBB = view;
        Console.write("Broadband Image Selected: " + view.id);
    };

    this.viewListNB = new ViewList(this);
    this.viewListNB.getMainViews();
    this.viewListNB.onViewSelected = function(view) {
        EMParameters.targetViewNB = view;
        Console.write("Narrowband Image Selected: " + view.id);
    };

    this.f_r_control = new NumericControl(this);
    this.f_r_control.label.text = "R channel:";
    this.f_r_control.setRange(0, 1);
    this.f_r_control.setValue(0.1);
    this.f_r_control.setPrecision(2);
    this.f_r_control.slider.setRange(1, 500);
    this.f_r_control.setValue(EMParameters.f_r);
    this.f_r_control.onValueUpdated = function(value) {
        EMParameters.f_r = value;
    };

    this.f_g_control = new NumericControl(this);
    this.f_g_control.label.text = "G channel:";
    this.f_g_control.setRange(0, 1);
    this.f_g_control.setPrecision(2);
    this.f_g_control.slider.setRange(1, 500);
    this.f_g_control.setValue(EMParameters.f_g);
    this.f_g_control.onValueUpdated = function(value) {
        EMParameters.f_g = value;
    };

    this.f_b_control = new NumericControl(this);
    this.f_b_control.label.text = "B channel:";
    this.f_b_control.setRange(0, 1);
    this.f_b_control.setPrecision(2);
    this.f_b_control.slider.setRange(1, 500);
    this.f_b_control.setValue(EMParameters.f_b);
    this.f_b_control.onValueUpdated = function(value) {
        EMParameters.f_b = value;
    };

    this.authorshipLabel = new Label(this);
    this.authorshipLabel.text = "Written by Igor Koprowicz\n© Copyright 2024-2025";
    this.authorshipLabel.textAlignment = TextAlign_Center;

    this.executeButton = new PushButton(this);
    this.executeButton.text = "Execute";
    this.executeButton.onClick = () => {
        this.ok();
    }
    this.executeButton.setFixedHeight(30);

    this.stf = function(view) {
      let P = new PixelMath;
      if(EMParameters.isLinked == 1){
        P.expression =
        "C = -2.8;\n" +
        "B = 0.25;\n" +
        "m = (med($T[0])+med($T[1])+med($T[2]))/3;\n" +
        "d = (mdev($T[0])+mdev($T[1])+mdev($T[2]))/3;\n" +
        "c = min( max(0,m+C*1.4826*d),1);\n" +
        "mtf(mtf(B,m-c),max(0,($T-c)/~c))";
        P.useSingleExpression = true;
        P.symbols = "C,B,m,d,c";
      } else if (EMParameters.isLinked == 0) {
        P.expression =
        "C = -2.8;\n" +
        "B = 0.25;\n" +
        "c = min(max(0,med($T)+C*1.4826*mdev($T)),1);\n" +
        "mtf(mtf(B,med($T)-c),max(0,($T-c)/~c))";
        P.useSingleExpression = true;
        P.symbols = "C,B,c";
      }
      P.clearImageCacheAndExit = false;
      P.cacheGeneratedImages = false;
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = true;
      P.rescale = false;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = false;
      P.showNewImage = true;
      P.executeOn(view);
  };

    this.mainSizer = new HorizontalSizer();
    this.mainSizer.margin = 20;

    this.previewControl = new ScrollControl(this);
    this.previewControl.setFixedSize(500, 400);
    this.previewControl.scrollBarsVisible = false;

    this.updatePreview = function() {
            if (EMParameters.targetViewBB && EMParameters.targetViewBB.image && EMParameters.targetViewNB && EMParameters.targetViewNB.image) {
                if (EMParameters.targetViewBB.image.colorSpace == 1 && EMParameters.targetViewNB.image.colorSpace == 0) {
                    Console.noteln("Updating preview...");

                    try {
                        let tempImage = new Image(EMParameters.targetViewBB.image.width, EMParameters.targetViewBB.image.height,
                                                  EMParameters.targetViewBB.image.numberOfChannels);

                        tempImage.assign(EMParameters.targetViewBB.image);

                        let window = new ImageWindow(tempImage.width, tempImage.height, tempImage.numberOfChannels,
                                                     tempImage.bitsPerSample, tempImage.isReal, tempImage.isColor);

                        EMParameters.tempWindows.push(window.mainView.id);

                        let tempView = window.mainView;

                        let P = new PixelMath();

                        P.expression = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_r + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
                        P.expression1 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_g + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
                        P.expression2 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_b + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";

                        P.useSingleExpression = false;
                        P.createNewImage = false;
                        P.executeOn(tempView);

                        if (this.autoSTFCheckbox.checked) {
                            this.stf(tempView);
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
                } else {
                    Console.criticalln("Error: Broadband image should be in RGB color space and narrowband should be in grayscale.");
                }
            }
        };

    this.refreshPreviewButton = new PushButton(this);
    this.refreshPreviewButton.text = "Refresh Preview";
    this.refreshPreviewButton.onClick = () => {
        if (EMParameters.targetViewBB && EMParameters.targetViewNB) {
            this.updatePreview();
        } else {
            Console.criticalln("Select both Broadband and Narrowband images before refreshing preview.");
        }
    };
    this.refreshPreviewButton.setFixedHeight(30);

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

    this.autoSTFCheckbox = new CheckBox(this);
    this.autoSTFCheckbox.text = "Auto STF";
    this.autoSTFCheckbox.checked = false;
    this.autoSTFCheckbox.onClick = function() {
      if (EMParameters.targetViewBB && EMParameters.targetViewNB) {
          this.dialog.updatePreview();
      } else {
          Console.criticalln("Select both Broadband and Narrowband images before applying Auto STF.");
      }
    };

    this.isLinkedCheckbox = new CheckBox(this);
    this.isLinkedCheckbox.text = "Linked Stretch?";
    this.isLinkedCheckbox.checked = true;
    this.isLinkedCheckbox.onClick = function() {
        EMParameters.isLinked = this.checked ? 1 : 0;
        this.dialog.updatePreview();
    };

    this.createPreviewImage = function() {
        let P = new PixelMath;
        P.expression = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_r + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
        P.expression1 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_g + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
        P.expression2 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_b + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
        P.useSingleExpression = false;
        P.createNewImage = true;
        P.newImageId = "Preview";
        P.newImageWidth = 0;
        P.newImageHeight = 0;
        P.newImageAlpha = false;
        P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
        P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

        P.executeGlobal();
        return View.viewById("Preview").image;
    };


    this.viewListBB.onViewSelected = function(view) {
        EMParameters.targetViewBB = view;
        this.dialog.updatePreview();
    }.bind(this);

    this.viewListNB.onViewSelected = function(view) {
        EMParameters.targetViewNB = view;
        this.dialog.updatePreview();
    }.bind(this);

    let buttonSizer = new HorizontalSizer();
    buttonSizer.add(this.refreshPreviewButton);
    buttonSizer.addSpacing(10);
    buttonSizer.add(this.executeButton);

    // Left sizer for controls
    let leftSizer = new VerticalSizer();
    leftSizer.addStretch();
    leftSizer.add(this.titleBox);
    leftSizer.addSpacing(5);
    leftSizer.add(this.instructionsBox);
    leftSizer.addSpacing(10);
    leftSizer.add(this.viewListLabelBB);
    leftSizer.addSpacing(3);
    leftSizer.add(this.viewListBB);
    leftSizer.addSpacing(10);
    leftSizer.add(this.viewListLabelNB);
    leftSizer.addSpacing(3);
    leftSizer.add(this.viewListNB);
    leftSizer.addSpacing(10);
    leftSizer.add(this.f_r_control);
    leftSizer.addSpacing(3);
    leftSizer.add(this.f_g_control);
    leftSizer.addSpacing(3);
    leftSizer.add(this.f_b_control);
    leftSizer.addSpacing(15);
    leftSizer.add(buttonSizer);
    leftSizer.addSpacing(10);
    leftSizer.add(this.authorshipLabel);
    leftSizer.addStretch();

    let zoomSizer = new HorizontalSizer();
    zoomSizer.add(this.zoomInButton);
    zoomSizer.addSpacing(5);
    zoomSizer.add(this.zoomOutButton);

    let stfSizer = new HorizontalSizer();
    stfSizer.add(this.autoSTFCheckbox);
    stfSizer.addSpacing(2);
    stfSizer.add(this.isLinkedCheckbox);

    let previewSizer = new VerticalSizer();
    previewSizer.addSpacing(3);
    previewSizer.add(stfSizer);
    previewSizer.add(zoomSizer);
    previewSizer.add(this.previewControl);
    previewSizer.addSpacing(10);

    this.mainSizer.add(leftSizer);
    this.mainSizer.addSpacing(15);
    this.mainSizer.add(previewSizer);

    this.sizer = this.mainSizer;
}

emDialog.prototype = new Dialog;

function showDialog() {
    let dialog = new emDialog();
    return dialog.execute();
}

function applyPixelMath() {
    let P = new PixelMath;

    P.expression = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_r + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
    P.expression1 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_g + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";
    P.expression2 = EMParameters.targetViewBB.fullId + " - " + EMParameters.f_b + " * (" + EMParameters.targetViewNB.fullId + " - med(" + EMParameters.targetViewNB.fullId + "))";

    P.useSingleExpression = false;
    P.createNewImage = true;
    P.newImageId = "Emissionless";
    P.newImageWidth = 0;
    P.newImageHeight = 0;
    P.newImageAlpha = false;
    P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
    P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;

    P.executeOn(EMParameters.targetViewBB);
}

function closeTemp() {
    for (let i = 0; i < EMParameters.tempWindows.length; i++) {
        let window = ImageWindow.windowById(EMParameters.tempWindows[i]);
        if (window !== null) {
            window.forceClose();
        }
    }
    EMParameters.tempWindows = [];
}

function main() {
    let dialog = new emDialog();
    let retVal = dialog.execute();
    Console.show();

    if (retVal == 1) {
        if (!EMParameters.targetViewBB || !EMParameters.targetViewNB) {
            Console.criticalln("!!! Error: Both Broadband and Narrowband images must be selected. !!!");
            return;
        }

        if(EMParameters.targetViewBB.image.colorSpace == 0 && EMParameters.targetViewNB.image.colorSpace == 1){
            Console.criticalln("!!! Error: Broadband image should be in RGB color space and narrowband should be in grayscale !!!");
            return;
        } else {
            if (EMParameters.targetViewBB.image.colorSpace !== 1) {
                Console.criticalln("!!! Error: Broadband image should be in RGB color space. !!!");
                return;
            }

            if (EMParameters.targetViewNB.image.colorSpace !== 0) {
                Console.criticalln("!!! Error: Narrowband image should be in grayscale. !!!");
                return;
            }
        }
        applyPixelMath();
        closeTemp();
        Console.noteln("Successfully managed emissions.");

        processEvents();
    } else {
        Console.criticalln("Canceled.");
        closeTemp();
    }
}

main();
