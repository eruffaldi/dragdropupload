	
//---------------------------------------------------------------------------------------------------------
// Utilities
//---------------------------------------------------------------------------------------------------------

if(!it) var it={};
if(!it.teslacore) it.teslacore={};

it.teslacore.dragdropuploadsb = function() 
{
    var pub = {};

    // creating stringbundle to localize some strings
    var gBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    var strings = gBundle.createBundle("chrome://dragdropupload/locale/dragdropupload.properties");
    var nsPreferences = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
    
    function fileFromUrl(url)
    {
        try
        {
            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
            var fileHandler = ios.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            return fileHandler.getFileFromURLSpec(url);
        }
        catch(e)
        {
            return undefined
        }
    }

    function pathFromUrl(url)
    {
        return fileFromUrl(url).path
    }

    function fileFromPath(path)
    {
        try
        {
            var aFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
            aFile.initWithPath(path);
            return aFile
        }
        catch(e)
        {
            return undefined
        }
    }

    function urlFromPath(path)
    {
        return urlFromFile(fileFromPath(path))
    }

    function urlFromFile(file)
    {
        var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var fileHandler = ios.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
        return fileHandler.getURLSpecFromFile(file);
    }

    pub.initFileBrowser = function () 
    {
        try
        {
            var obj_HomeDirpath;
            var obj_HomeDir = undefined;
            try
            {
                obj_HomeDirpath = nsPreferences.getCharPref("dragdropupload.sidebar.path");
                if(obj_HomeDirpath != "")
                {
                    obj_HomeDir = pub.sbTrader.dirPathAsFile(obj_HomeDirpath)
                    if(obj_HomeDir == undefined)
                        alert('Saved directory not more valid: ' + obj_HomeDirpath);
                }
            }
            catch(e)
            {
            }
            if(obj_HomeDir == undefined)
                obj_HomeDir = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("Home", Components.interfaces.nsIFile);
                
            document.getElementById("file-browser-tree").ref = urlFromFile(obj_HomeDir)
            document.getElementById("sbTradePath").value = obj_HomeDir.path
        }
        catch(e)
        {
            alert('Exception during init' + e);
        }
    }

    pub.tagTreeOnClick = function () 
    {
        var tree = document.getElementById("file-browser-tree");
        var url = tree.contentView.getCellValue(tree.currentIndex, tree.columns.getNamedColumn("Name"));
    }

    pub.itemObserver = 
    {
      canHandleMultipleItems: true,
      geturlof : function (tree, index)
      {
            return tree.contentView.getCellValue(index, tree.columns.getNamedColumn("Name"));
      },
      getpathof : function (tree, index)
      {
            return pathFromUrl(tree.contentView.getCellValue(index, tree.columns.getNamedColumn("Name")))
      },
      onDragStart: function (evt , transferData, action)
      {
        if(evt.originalTarget.localName == "thumb")
            throw ("xxx");
            
        var tree = document.getElementById("file-browser-tree");

        var tbo = tree.boxObject;
        tbo = tbo.QueryInterface(Components.interfaces.nsITreeBoxObject);
        var tbov = tbo.view;
        transferData.data = new TransferDataSet();
        
        if(tbov.selection.count <= 1)
        {
        /*
            var first ={};
            var last ={};
            tbov.selection.getRangeAt(0, first, last);
            var current = first.value;*/
            var data = new TransferData();		
            data.addDataForFlavour("application/x2-moz-file",this.getpathof(tree,tree.currentIndex));
            transferData.data.push(data);
        }
        else
        {
            /// for every ranege
            for(var iranges = 0; iranges < tbov.selection.getRangeCount(); iranges++)
            {
                try
                {
                var first ={};
                var last ={};
                var rstart = tbov.selection.getRangeAt(iranges,first,last);
                    for(var j = first.value; j <= last.value; j++)
                    {
                        var td = new TransferData();
                        td.addDataForFlavour("application/x2-moz-file",this.getpathof(tree, j));
                        transferData.data.push(td);
                    }
                }
                catch(e)
                {
                    alert(e);
                }

            }
        }
      }
    };
    
    pub.sbTrader = {
        get TREE()     { return document.getElementById("file-browser-tree"); },
        get TEXT()     { return document.getElementById("sbTradePath"); },
        rightDir : null,
        selectPath : function()
        {
            var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
            FP.init(window, strings.GetStringFromName("SelectPathString"), FP.modeGetFolder);
            try
            {
                var dd = this.dirPathAsFile(this.TEXT.value);
                if(dd == undefined)
                {
                    alert(strings.GetStringFromName("NoValidDirString"));
                    var dirService = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
                    FP.displayDirectory = dirService.get("Home", Components.interfaces.nsIFile);
                }
                else
                    FP.displayDirectory = dd;
                var answer = FP.show();
                if ( answer == FP.returnOK )
                {
    //				alert('Selected '+ FP.file.path);
                    this.TEXT.value = FP.file.path;
                    //this.TREE.ref = FP.file; // refresh
                    nsPreferences.setCharPref("dragdropupload.sidebar.path", FP.file.path);
                    window.location.reload();
                } else {			
                }
            }
            catch(e)
            {
                alert('error ' + e);
            }
        },
        goPath: function ()
        {
            try
            {
                var d = this.dirPathAsFile(this.TEXT.value);
                if(d != undefined)
                {
                    //this.TREE.ref = d;
                    nsPreferences.setCharPref("dragdropupload.sidebar.path", this.TEXT.value);		
                    window.location.reload();
                }
                else
                    alert(strings.GetStringFromName("NoValidDirString"));
            }
            catch(e)
            {
                alert('Error ' + e);
            }
        },
        dirPathAsFile : function(aPath)
        {
            if ( !aPath ) return undefined;
            var aFileObj = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            try {
                aFileObj.initWithPath(aPath);
            } catch(ex) {
                //alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + aPath);
                return undefined;
            }
            if ( !aFileObj.exists() || !aFileObj.isDirectory() ) {
                alert("Sidebar: not exists or not directory")
                //alert(this.STRING.getString("ERROR_INVALID_FILEPATH") + "\n" + aPath);
                return undefined;
            }
            return aFileObj;
        }
    };
    return pub;
}
();

