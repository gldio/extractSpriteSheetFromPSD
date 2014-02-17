/**
 * @author  gldio / http://gldio.com/
 * @version 2014.0602
 * @since 06.02.2014
 */

#target photoshop

var VERSION = "2014.0602",
	AUTHOR = "@gldio",
	APP_NAME = "extractSpriteSheetFromPSD";
	OPT = {file: null, col: -1, row: -1, canvas: false, canvasWidth: 2048, canvasHeight: 2048, reverseLayers:true, pngquant:false};

main();

function main(){

	app.bringToFront();

	// debug level: 0-2 (0:disable, 1:break on error, 2:break at beginning)
	$.level = 1;

	GetSettings();
	ShowOptionsMenu();
};

function ShowOptionsMenu(){
	var ui = "dialog { text: '" + APP_NAME + " v" + VERSION + " ( " + AUTHOR + " )', \
		alignChildren: 'column', \
		options: Panel { \
			orientation: 'column', alignment: 'left', \
			text: 'Options', \
			others: Group { \
				chkR: Checkbox { text: 'Reverse Layers', value: true }, \
				chkQ: Checkbox { text: 'PNG Quantization', value: false } \
			}, \
			arrange: Panel { \
				orientation: 'row', alignment: 'center', \
				text: 'Arrange Options', \
				free: RadioButton { text: 'Free', value: true }, \
				col: RadioButton { text: 'Column', value: false }, \
				row: RadioButton { text: 'Row', value: false }, \
				txt: EditText { text: '1', characters: 2, enabled: false, size: [30, 18] } \
			}, \
			canvas: Panel { \
				orientation: 'row', alignment: 'left', \
				text: 'Canvas Options', \
				chk: Checkbox { text: 'Canvas fill', value: false }, \
				st: StaticText { text: 'Canvas Width: ' }, \
				w: EditText { text: '1024',  characters: 4, enabled: false }, \
				st2: StaticText { text: 'Canvas Height: ' }, \
				h: EditText { text: '1024',  characters: 4, enabled: false } \
			} \
		}, \
		file: Panel { \
			orientation: 'row', alignment: 'center', \
			text: 'Select File', \
			st: StaticText { text: 'No file selected!', size: [250, 13] }, \
			btnSelect: Button { text:'Browse', properties:{name:'browse'} } \
		}, \
		buttons: Group { \
			orientation: 'row', alignment: 'center', \
			btnDone: Button { text:'Done', properties:{name:'ok'} }, \
			btnCancel: Button { text:'Cancel', properties:{name:'cancel'} } \
		} \
	}";

	var win = new Window (ui);
    win.graphics.backgroundColor = win.graphics.newBrush (win.graphics.BrushType.THEME_COLOR, "appDialogBackground");

    win.options.arrange.free.onClick = win.options.arrange.row.onClick = win.options.arrange.col.onClick = function(){
    	win.options.arrange.txt.enabled = !win.options.arrange.free.value;
    }

    win.options.canvas.w.onChanging = win.options.canvas.h.onChanging = win.options.arrange.txt.onChanging = function(){
    	if (this.text.match(/[^\d]/)) this.text = this.text.replace(/[^\d]/g, '');
    	if (this.text.length > this.characters) this.text = this.text.slice(0, this.characters);
    }

    win.options.canvas.chk.onClick = function(){
    	win.options.canvas.w.enabled = this.value;
    	win.options.canvas.h.enabled = this.value;
    	win.options.arrange.enabled = !this.value;
    }

    win.file.btnSelect.onClick = function(){
    	OPT.file = app.openDialog()[0];
    	var ext = decodeURI(OPT.file.name).replace(/^.*\./,'');

		if (!OPT.file) win.file.st.text = "No file selected!";
		else if (ext.toLowerCase() != 'psd') win.file.st.text = 'No PSD File selected!';
		else win.file.st.text = OPT.file.name;
    }

    win.buttons.btnDone.onClick = function(){
    	if (!OPT.file) {
    		alert("Select a PSD File!");
    		return;
    	}

    	OPT.canvas = win.options.canvas.chk.value;
    	OPT.canvasWidth = parseInt(win.options.canvas.w.text);
    	OPT.canvasHeight = parseInt(win.options.canvas.h.text);
    	OPT.col = win.options.arrange.col.value?parseInt(win.options.arrange.txt.text):-1;
    	OPT.row = win.options.arrange.row.value?parseInt(win.options.arrange.txt.text):-1;
    	OPT.reverseLayers = win.options.others.chkR.value;
    	OPT.pngquant = win.options.others.chkQ.value;

    	win.close();

    	DoTheJobAndExit();
    }

    win.options.canvas.chk.value = OPT.canvas;
    win.options.canvas.chk.onClick();

	win.options.canvas.w.text = OPT.canvasWidth;
	win.options.canvas.h.text = OPT.canvasHeight;

	win.options.arrange.col.value = OPT.col > 0;
	win.options.arrange.row.value = OPT.row > 0;
	win.options.arrange.txt.text = OPT.col > 0?OPT.col:(OPT.row > 0?OPT.row:1);
	win.options.arrange.free.onClick();
	
	win.options.others.chkR.value = OPT.reverseLayers;
	win.options.others.chkQ.value = OPT.pngquant;

	if(OPT.file) win.file.st.text = OPT.file.name;

    win.center();
    win.show();
}

function DoTheJobAndExit(){
	open (OPT.file);

	var doc = app.activeDocument;
	var docLays = doc.layers;

	var path = app.activeDocument.path;
	var name = app.activeDocument.name.replace(/\.[^\.]+$/, '');

	var startRulerUnits = app.preferences.rulerUnits;
	var startTypeUnits = app.preferences.typeUnits;
	var startDisplayDialogs = app.displayDialogs;

	app.preferences.rulerUnits = Units.PIXELS;
	app.preferences.typeUnits = TypeUnits.PIXELS;
	app.displayDialogs = DialogModes.NO;

	doc.trim(TrimType.TRANSPARENT);

	var frameW = parseInt(doc.width), frameH = parseInt(doc.height),
		row = Math.round(Math.sqrt(doc.layers.length)),
		col = Math.ceil(doc.layers.length / row),

		sText = "", i = 0, k = 0, lays = [],
		prev = {x: 0, y: 0, w: 0, h:0, colNum:-1},

		lay, tlay, tcolNum = 0,
		x, y, w, h, dx, dy;

	if(OPT.col != -1){
		col = OPT.col;
		row = doc.layers.length / col;
	} else if(OPT.row != -1){
		row = OPT.row;
		col = doc.layers.length / row;
	}

	// set layers for speed calculation
	for(i = 0;i < docLays.length;i++){
		lay = docLays[i];
		bounds = lay.bounds;
		bounds = [parseInt(bounds[0]),parseInt(bounds[1]),parseInt(bounds[2]),parseInt(bounds[3])];
		
		dx = parseInt((frameW - (bounds[2] - bounds[0])) * .5);
		dy = parseInt((frameH - (bounds[3] - bounds[1])) * .5);
		
		lays.push({layer: lay, x: bounds[0], y: bounds[1], w: bounds[2] - bounds[0], h: bounds[3] - bounds[1], dx:dx, dy:dy});
	}

	if(OPT.reverseLayers) lays.reverse();

	// do calculation and translate
	for(i = 0;i < lays.length;i++){
		lay = lays[i];
		app.activeDocument.activeLayer = lay.layer;
		lay.layer.visible = 1;

		lay.layer.translate(-lay.x, -lay.y);

		if(!OPT.canvas){
			x = (i % col) * frameW;
			y = k * frameH;
		}else {
			x = prev.x;
			y = 0;//prev.y;

			if(x + lay.w > OPT.canvasWidth){
				x = 0;
				prev.colNum = tcolNum;
				tcolNum = 0;
			}
		}
		
		if(prev.colNum != -1 && i - prev.colNum > -1){
			for(k = i - prev.colNum - tcolNum; k < i - tcolNum; k++){
				tlay = lays[k];
				if(((x >= tlay.x && x <= tlay.x + tlay.w) || (x + lay.w >= tlay.x && x + lay.w <= tlay.x + tlay.w)) && y < tlay.y + tlay.h){
					y = tlay.y + tlay.h;
				}
			}
		}		

		lay.x = x;
		lay.y = y;
		lay.layer.translate(x, y);

		sText += "\r{x:" + lay.x + ", y:" + lay.y + ", dx:" + lay.dx + ", dy:" + lay.dy + ", ";
		sText += "w: " + lay.w + ", h: " + lay.h + ", name:'" + lay.layer.name + "'},";

		if(!OPT.canvas){
			if(i % col >= col - 1) k++;
		}else {
			prev = {x: x + lay.w, y: lay.y, w: lay.w, h: lay.h, colNum: prev.colNum};
			tcolNum++;
		}
	}

	sText = "var spriteSheet = {file: '" + name + ".png', w: " + frameW + ", h: " + frameH + ", frames: [" + sText.substr(0, sText.length - 1) + "\r]};";

	if(OPT.canvas) doc.resizeCanvas(OPT.canvasWidth, OPT.canvasHeight, AnchorPosition.TOPLEFT);
	else doc.resizeCanvas(frameW * col, frameH * row, AnchorPosition.TOPLEFT);

	doc.trim(TrimType.TRANSPARENT);

	// save
	var fileRef = File(path + "/" + name +".js");

	if(fileRef.exists) fileRef.remove();

	fileRef.encoding = "UTF8";
	fileRef.open("e", "TEXT", "????");
	fileRef.writeln(sText);
	fileRef.close();
	fileRef = null;

	var expOpt = new ExportOptionsSaveForWeb();
	expOpt.format = SaveDocumentType.PNG;
	expOpt.transparency = true;
	expOpt.blur = 0.0;
	expOpt.includeProfile = false;
	expOpt.interlaced = false;
	expOpt.optimized = true;
	expOpt.PNG8 = false;

	doc.exportDocument(new File(path + "/" + name + ".png"), ExportType.SAVEFORWEB, expOpt);

	if(OPT.pngquant) execPngQuant();

	app.preferences.rulerUnits = startRulerUnits;
	app.preferences.typeUnits = startTypeUnits;
	app.displayDialogs = startDisplayDialogs;

	doc.close(SaveOptions.DONOTSAVECHANGES);

	SaveSettings();
	OPT.file = null;

	alert("Done, Yay!");
}

function execPngQuant(){
	var filePath = OPT.file.path + "/" + OPT.file.name.replace(/\.[^\.]+$/, '') + ".png";
	filePath = filePath.slice(1, filePath.length).replace(/\//g, "\\").replace(/\\/, ":\\");

	var cmdLine = "\"" + $.includePath + "\\pngquant.exe\" --force --ext .png \"" + filePath + "\"";

	var bat = new File(Folder.temp + "/pngquant.bat");
	bat.open("w");
	bat.writeln(cmdLine);
	bat.close();
	bat.execute();
	//bat.remove();
}

function SaveSettings() {
	var desc = new ActionDescriptor();
	desc.putString(app.stringIDToTypeID("file"), OPT.file.fullName);
	desc.putInteger(app.stringIDToTypeID("col"), OPT.col);
	desc.putInteger(app.stringIDToTypeID("row"), OPT.row);
	desc.putBoolean(app.stringIDToTypeID("canvas"), OPT.canvas);
	desc.putInteger(app.stringIDToTypeID("canvasWidth"), OPT.canvasWidth);
	desc.putInteger(app.stringIDToTypeID("canvasHeight"), OPT.canvasHeight);
	desc.putBoolean(app.stringIDToTypeID("reverseLayers"), OPT.reverseLayers);
	desc.putBoolean(app.stringIDToTypeID("pngquant"), OPT.pngquant);
	app.putCustomOptions(APP_NAME, desc, true );
}

function GetSettings() {
	var desc = null;
	try{ desc = app.getCustomOptions(APP_NAME); }catch(e){}

	if(!desc) return;
	OPT.file = File(desc.getString(app.stringIDToTypeID("file")));
	OPT.col = desc.getInteger(app.stringIDToTypeID("col"));
	OPT.row = desc.getInteger(app.stringIDToTypeID("row"));
	OPT.canvas = desc.getBoolean(app.stringIDToTypeID("canvas"));
	OPT.canvasWidth = desc.getInteger(app.stringIDToTypeID("canvasWidth"));
	OPT.canvasHeight = desc.getInteger(app.stringIDToTypeID("canvasHeight"));
	OPT.reverseLayers = desc.getBoolean(app.stringIDToTypeID("reverseLayers"));
	OPT.pngquant = desc.getBoolean(app.stringIDToTypeID("pngquant"));
}
