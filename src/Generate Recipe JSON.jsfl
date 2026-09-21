/*
* Generate Recipe JSON.jsfl
* v 3.7.21
* Michael Gochoco
* (c) 2026
*
* Description: Generates a Recipe JSON file for replacing bitmap symbols and audio with the Animate Asset Replacer
*
* Usage: Select Bitmaps and Audio in Library and Run Script
*/

(function () {
    var dom = fl.getDocumentDOM();
    if (!dom) {
        alert("No document is open.");
        return;
    }

    var lib = dom.library;
    var items = lib.getSelectedItems();

	function generateBitmapLookup() {
		var result = {};

		var libItems = lib.items;
		var bitmaps = [];
		var symbols = [];
	
		// ------------------------------------------------------------
		// Collect bitmap and symbol Library items
		// ------------------------------------------------------------
		for (var i = 0; i < libItems.length; i++) {
			var it = libItems[i];
	
			if (it.itemType === "bitmap") {
				bitmaps.push(it);
			}
			else if (
				it.itemType === "movie clip" ||
				it.itemType === "graphic" ||
				it.itemType === "button"
			) {
				symbols.push(it);
			}
		}
	
		// ------------------------------------------------------------
		// Build lookup table
		// bitmap library name -> true
		// ------------------------------------------------------------
		var bitmapLookup = {};
		for (var b = 0; b < bitmaps.length; b++) {
			bitmapLookup[getBaseName(bitmaps[b].name)] = true;
		}
	
		// ------------------------------------------------------------
		// bitmapTable
		// ------------------------------------------------------------
		// Include every bitmap even if nothing uses it.
		for (var b = 0; b < bitmaps.length; b++) {
			result[getBaseName(bitmaps[b].name)] = [];
		}
	
		// ------------------------------------------------------------
		// Scan symbols
		// ------------------------------------------------------------
		for (var s = 0; s < symbols.length; s++) {
			var symbol = symbols[s];
			var timeline = symbol.timeline;
	
			if (!timeline) {
				continue;
			}
	
			// Keep track so the same symbol isn't added more than once
			// for the same bitmap.
			var foundInSymbol = {};
	
			var layers = timeline.layers;
	
			for (var l = 0; l < layers.length; l++) {
	
				var layer = layers[l];
				var frames = layer.frames;
	
				if (!frames) {
					continue;
				}
	
				/*
					Animate's layer.frames array can contain repeated
					references for frame spans.
	
					We only need to inspect each keyframe once.
				*/
	
				var lastStartFrame = -1;
	
				for (var f = 0; f < frames.length; f++) {
	
					var frame = frames[f];
	
					if (!frame) {
						continue;
					}
	
					// Only process the first frame of a frame span.
					if (frame.startFrame !== f) {
						continue;
					}
	
					var elements = frame.elements;
	
					if (!elements) {
						continue;
					}
	
					for (var e = 0; e < elements.length; e++) {
	
						var element = elements[e];
	
						/*
							Bitmap instances have elementType "instance"
							and their libraryItem points to the bitmap.
						*/
	
						if (
							element.elementType === "instance" &&
							element.libraryItem &&
							element.libraryItem.itemType === "bitmap"
						) {
	
							var bitmapName = getBaseName(element.libraryItem.name);
	
							if (
								bitmapLookup[bitmapName] &&
								!foundInSymbol[bitmapName]
							) {
								result[bitmapName].push(getBaseName(symbol.name));
								foundInSymbol[bitmapName] = true;
							}
						}
					}
				}
			}
		}

		return result;
	}

	var bitmapTable = generateBitmapLookup();


    if (!items || items.length === 0) {
        alert("Select one or more bitmap/audio items in the Library panel.");
        return;
    }

	(function(){
		JSON.prettyPrint = false;
		JSON.stringify = function(obj) {
			return _internalStringify(obj, 0);
		};
		function _internalStringify(obj, depth, fromArray) {
			var t = typeof (obj);
			if (t != "object" || obj === null) {
				if (t == "string") return '"'+obj+'"';
				return String(obj);
			}
			else {
				var n, v, json = [], arr = (obj && obj.constructor == Array);
				var joinString, bracketString, firstPropString;
				if(JSON.prettyPrint) {
					joinString = ",\n";
					bracketString = "\n";
					for(var i = 0; i < depth; ++i) {
						joinString += "\t";
						bracketString += "\t";
					}
					joinString += "\t";
					firstPropString = bracketString + "\t";
				}
				else {
					joinString = ",";
					firstPropString = bracketString = "";
				}
				for(n in obj) {
					v = obj[n]; t = typeof(v);
					if (t == "function") continue;
					if (t == "string") v = '"'+v+'"';
					else if (t == "object" && v !== null) v = _internalStringify(v, depth + 1, arr);
					json.push((arr ? "" : '"' + n + '":') + String(v));
				}
				return (fromArray || depth === 0 ? "" : bracketString)+ (arr ? "[" : "{") + firstPropString + json.join(joinString) + bracketString + (arr ? "]" : "}");
			}
		}
		JSON.parse = function(str) {
			if (str === "") str = '""';
			eval("var p=" + str + ";");
			return p;
		};
	}(JSON = JSON || {}));
	var JSON;

	function jsonEscape(str) {
        return String(str)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    }

    function getBaseName(path) {
        var name = String(path);
        name = name.replace(/^.*[\/\\]/, "");
        name = name.replace(/\.[^\.]+$/, "");
        return name;
    }

    function safeFileName(name) {
        return String(name).replace(/[\\\/:\*\?"<>\|]/g, "_");
    }

    function getFolderURI(fileURI) {
        return fileURI.replace(/\/[^\/]*$/, "");
    }

    function isPhotoJPEG(bitmapItem) {
        var type = "";

        try {
            type = String(bitmapItem.compressionType).toLowerCase();
        } catch (e) {
            type = "";
        }

        return type.indexOf("photo") !== -1 || type.indexOf("jpeg") !== -1 || type.indexOf("jpg") !== -1;
    }

    var entries = [];

    for (var i = 0; i < items.length; i++) {
        var item = items[i];

		var isBitmap = item.itemType == "bitmap";
		var isAudio = item.itemType == "sound";

        if (!item || !isBitmap && !isAudio) {
            continue;
        }

        var imageID = getBaseName(item.name);
//        var ext = isPhotoJPEG(item) ? "jpg" : "png";
		var ext;

		if(isBitmap)
			ext = isPhotoJPEG(item) ? "jpg" : "png";
		else
			ext = "mp3";

		var fileName = safeFileName(imageID) + "." + ext;

		var itemObj;

		if(isBitmap) {
			itemObj = {
				asset_id: imageID,
				asset_type: "image",
				replacement_image: fileName,
				parents: bitmapTable[imageID]
			};
		}
		else {
			itemObj = {
				asset_id: imageID,
				asset_type: "audio",
				replacement_audio: fileName,
				operation: {
					mime_type: "audio/mpeg"
				}
			};
		}
		
        entries.push({itemObj: itemObj, item: item, fileName: fileName});
    }

    if (entries.length === 0) {
        alert("No bitmap or audio items were selected.");
        return;
    }

    entries.sort(function (a, b) {
        var aa = a.itemObj.asset_id.toLowerCase();
        var bb = b.itemObj.asset_id.toLowerCase();

        if (aa < bb) return -1;
        if (aa > bb) return 1;
        return 0;
    });

	// limitation of the API that cannot see All FIles in the save dialog
	var saveURI = fl.browseForFileURL("save", "Save Recipe JSON", "JSON Files (*.json)", "json");

	if (!saveURI) {
		return;
	}

	saveURI = saveURI.replace(/\*/g, "");
	saveURI = saveURI.replace(/\.json$/i, "");
	saveURI += ".json";

	if(confirm("Export Bitmap/Audio Files?")) {
		var overwrite = confirm("Overwrite File if Exists?");
		var outputFolderURI = getFolderURI(saveURI);
		for (var e = 0; e < entries.length; e++) {
			var exportURI = outputFolderURI + "/" + entries[e].fileName;
			if(overwrite || !FLfile.exists(exportURI))
				entries[e].item.exportToFile(exportURI);
		}
	}

	var exportObj = {
		task: "replace_embedded_manifest_assets",
		image_processing: {
			match_original_image_dimensions: true,
			resize_mode: "contain",
			skip_resize_if_dimensions_already_match: true,
			center: true
		},
		operation: {
			preserve_replacement_format: true
		},
		replacements: [
		],
		output: {
			type: "html",
			filename_suffix: "_assets_replaced"
		}
	};

    for (var j = 0; j < entries.length; j++) {
		exportObj.replacements.push(entries[j].itemObj);
	}

	JSON.prettyPrint = true;
	var json = JSON.stringify(exportObj);

    var success = FLfile.write(saveURI, json);

    if (!success) {
        alert("Failed to write JSON file:\n" + saveURI);
        return;
    }

    alert(
        "Export complete.\n\n" +
        "Recipe exported: " + entries.length + "\n" +
        "JSON:\n" + saveURI
    );
})();