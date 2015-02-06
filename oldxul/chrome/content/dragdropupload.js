	
//---------------------------------------------------------------------------------------------------------
// Utilities
//---------------------------------------------------------------------------------------------------------

if(!it) var it={};
if(!it.teslacore) it.teslacore={};

it.teslacore.dragdropupload = function() 
{
    var pub = {};

    // creating stringbundle to localize some strings
    var gBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    var strings = gBundle.createBundle("chrome://dragdropupload/locale/dragdropupload.properties");
    var nsPreferences = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
    
    function dumpObject( object, depth, max )
    {
        depth = depth || 0;
        max = max || 2;
        if ( depth > max )
            return false;
        var indent = "";
        for ( var i = 0; i < depth; i++ ) indent += " ";
        var output = "";
        for ( var key in object )
        {
            output += "\n" + indent + key + ": ";
            switch (typeof object[key])
            {
            case "object":
                output += dumpObject(object[key], depth + 1, max);
                break;
            case "function":
                output += "function";
                break;
            default:
                output += object[key];
                break;
            }
        }

        return output;
       } 

    function myDump(aMessage) {
        var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
        consoleService.logStringMessage("DragDropUpload: " + aMessage);   
    }

   // br|pr
    var reAttachFile = /\s*(Attach a file|Allega un file|Bestand toevoegen als bijlage|Jounder un fichier|Datei anh.ngen|Adjuntar un archivo|Anexar um arquivo|Anexar um ficheiro)\s*/
    // br|pr
    var reAttachAnotherFile = /\s*(Attach another file|Nog een bestand toevoegen als bijlage|Allega un altro file|Joindre un autre fichier|Weitere Datei anh.ngen|Adjuntar otro archivo|Anexar outro arquivo|Anexar outro ficheiro)\s*/
    function startsWith(s,pattern) {
        var d = s.length - pattern.length;
        return d >= 0 && s.substr(0,pattern.length) === pattern
    }

    function kerioattach(x)
    {
        // document.getElementById("at").getElementsByTagName("img")[0].src.indexOf("attach")
        var a = x.getElementsByTagName("img")
        if(a.length != 1)
            return false
        return a[0].src.indexOf("attach") >= 0;
    }

    function basecampattach(x)
    {
        // document.getElementById("at").getElementsByTagName("img")[0].src.indexOf("attach")
        var a = x.getElementsByTagName("p")
        for(var i = 0; i < a.length; i++)
            if(a[i].className == "add_another")
            {
                var q = a[i].getElementsByTagName("a")
                return q.length == 1 ? q[0]:false
            }
        return false
    }

    function endsWith(s,pattern) {
        var d = s.length - pattern.length;
        return d >= 0 && s.substr(d,pattern.length) === pattern;
    }
        
    function setRecog(t)
    {
        to = { description: "Drag Drop Upload Extension", name:"dragdropupload" }
        if (t == undefined)
            return
        try
        {
            if (!("extensions" in t))
            {
                t.extensions = { }
                t.extensions[to.name] = to
            }
            else if (!(to.name in t.extensions))
                t.extensions[to.name] = to
        }
        catch(e)
        {
            alert("DragDropUpload: initialization exception " + e)
        }
        /*else
        {
            /*
            try
            {
                found = False
                for (var e in window.navigator.extensions)
                {
                    if(e.name == to.name)
                    {
                        found = True
                        break
                    }
                }
                if(!found)
                    window.navigator.extensions.push(to)
            }
            catch
            {
                
            }
            
        }*/
    }
      
    /**
     * Given an INPUT field name analyzes it
     *
     * e.g. file-1 => file-
     */
    function analyzeName(name)
    {
        if(!name)
            return  { type : "", number : 0, prefix: "" }
        var prefix = name;
        var namecount = 0;
        
        if(endsWith(name,"[]"))
            return { type : "PHP", number : 0, prefix: name }
        
        /// get the number from the ending of the prefix
        for(j = prefix.length-1; j >= 0; j--)
        {
            namecount = parseInt(prefix.substr(j));
            if(isNaN(namecount))
            {
                break;
            }
        }
        
        /// cases: all number, number in the end, no number
        if(j < 0)
            return { type : "", number : 0, prefix: name }
        else
            return { type : "number", number : parseInt(prefix.substr(j+1)), prefix: prefix.substring(0,j+1) }
    }


    function findParentForm(e,n)
    {
        if(e.form)
            return e.form
        try
        {
            var s = e.nodeName
            e = e.parentNode;
            while(e && (e.nodeName != "form" && e.nodeName != "FORM"))
            {
                s += " " + e.nodeName;
                e = e.parentNode;
            }
            if(!e)
            {
                //alert("DragDropUpload " + s);
            }
            return e;
        }
        catch(ee)
        {
            alert("DragDropUpload findParentForm: " + ee);
        }
    }

    /**
     * Simulates the click of the specified node
     */
    function simulateClick(node) 
    {
        try
        {
            var event = node.ownerDocument.createEvent("MouseEvents");  
            event.initMouseEvent("click",
                                 true, // can bubble
                                 true, // cancellable
                                 node.ownerDocument.defaultView, // contentWindow
                                 1, // clicks
                                 0, 0, // screen coordinates
                                 0, 0, // client coordinates
                                 false, false, false, false, // control/alt/shift/meta
                                 0, // button,
                                 node);  
            node.dispatchEvent(event);
        }
        catch(e) {
            alert("error during sim click " + e)
        }
    }

    /**
     * Simulates the click of the specified node
     */
    function simulateOnChange(node) 
    {
        try
        {
            var event = node.ownerDocument.createEvent("HTMLEvents");  
            event.initEvent("change",true,true);
            node.dispatchEvent(event);
        }
        catch(ex)
        {
        }
    }

    /**
     * Trims the spaces of a string using regular expressions
     */  
    function TrimString(sInString) {
      sInString = sInString.replace( /^\s+/g, "" );// strip leading
      return sInString.replace( /\s+$/g, "" );// strip trailing
    }

    function aAdd(r, a)
    {
        for(var i = 0; i < a.length; ++i)
            r.push(a[i]);
    }

    /**
     * Recursive function that scans for INPUT fields in a page taking into account
     * frames and iframes that do not answer for getElementsByTagName
     */
    function getElementsByTagNameDeep(page,name)
    {	
        if (page == null) return [];
        //frames in the document are implemented in this way:
        //FRAMESET=>FRAME=>#document
        //HTMLFrameElement=>HTMLDocument
        
        var r = [];
        if(page == undefined)
            return r;
        var frames = page.getElementsByTagName("FRAME");
        for(var i = 0; i < frames.length; i++)
        {				
            var frame = frames[i];
            try
            {
                aAdd(r,getElementsByTagNameDeep(frame.contentDocument,name));
            }
            catch(e)
            {
            }
        }	
        
        var frames = page.getElementsByTagName("IFRAME");
        for(var i = 0; i < frames.length; i++)
        {				
            var frame = frames[i];
            try
            {
                aAdd(r,getElementsByTagNameDeep(frame.contentDocument,name));
            }
            catch(e)
            {
            }
        }	
        
        aAdd(r, page.getElementsByTagName(name));
        return r;
    }


    //---------------------------------------------------------------------------------------------------------
    // Gmail Specific
    //---------------------------------------------------------------------------------------------------------


    function makeFileFromPath(path,folder)
    {
        var localfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile)
        //alert(folder == undefined ? path:folder.path+dirSeparator+path)
        localfile.initWithPath(folder == undefined ? path:folder.path+dirSeparator+path)
        return localfile
    }

    function makeFileFromPathFollow(path,folder)
    {
        var localfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile)
        localfile.followLinks =true;
        //alert(folder == undefined ? path:folder.path+dirSeparator+path)
        localfile.initWithPath(folder == undefined ? path:folder.path+dirSeparator+path)
        return localfile
    }

    function getTempDir()
    {
        // http://developer.mozilla.org/en/docs/Code_snippets:File_I/O#Getting_special_files
        const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");	
        r = ""
        try
        {
            r=(new DIR_SERVICE()).get("TmpD", Components.interfaces.nsIFile).path; 
        }
        catch(e) {alert(e)}
        return r
    }

    /// make a temporary file with the given prefix and suffix, containing the given data
    function prepareTemporaryFile(data,prefix,suffix)
    {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        input = {value:prefix + suffix};
        check = {value:false};
        var okorcancel;
        try
        {
        okorcancel = promptService.prompt(window, 'DragDropUpload Temporary File', 'Please. Enter the name of the file', input,null,check);
        }
        catch(e)
        {
            alert("bad prompt "+e)
            return;
        }
        if(!okorcancel)
        {
            return;
        }
        dir = makeFileFromPath(getTempDir())
        dir.append("dragdropupload")
        if(!dir.exists())
        {
            try
            {
                dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
            }
            catch(e) {
                alert("cannot create directory "+e)
            }
        }
        dir.append(input.value)
        if(!dir.exists())
        {
            try
            {
            dir.create(Components.interfaces.nsIFile.FILE_TYPE, 0755);
            }
            catch(e){
                alert("cannot create file for writing\n"+dir.path+"\n"+e)
            return 
            }
        }
        // make temporary folder
        // make file
        var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
        try
        {
        outputStream.init( dir, 0x04 | 0x08 | 0x20, 420, 0 );
        var result = outputStream.write( data, data.length )
        outputStream.close();
        }
        catch(e) { 
            alert("Error writing file "+e)
            return 
        }
        return [dir.path]
        
    }

    function gmailfindattacher1(targetForm)
    {
        var spans = getElementsByTagNameDeep(targetForm,"SPAN");
        var rt2 = null
        for(var j = 0; j < spans.length; j++)
        {
            var s = spans[j]
            if(s.innerHTML.match(reAttachFile) || s.innerHTML.match(reAttachAnotherFile))
                return s
        }
    }

        // div
        //	div
        //		div
        //			input
        //	span
    function gmailfindattacher2(targetForm)
    {
        var inputFields = targetForm.getElementsByTagName("INPUT");
        for(var i = 0; i < inputFields.length; i++)
        {
            try
            {
                var inp = inputFields[i]
                if(inp.type != "file")
                    continue
                var tt = inp.parentNode.parentNode.parentNode.getElementsByTagName("span");
                for(var j = 0; j < tt.length; j++)
                {
                    var q = tt[j];
                    var t = q.innerHTML;
                    if(t.match(reAttachAnotherFile) != null)
                        return q
                }
            }
            catch(e)
            {
            }		
        }
    }

    /// given a form and n places to be created...
    /// 1) identify for GMAIL
    /// 2) search for "Attach a file" or "Attach Another file"
    function makeGmailSpace(targetForm,neededInputs)
    {
        if(neededInputs == 0)
            return 0;
        var rt = gmailfindattacher2(targetForm);
        if(!rt)
            rt = gmailfindattacher1(targetForm);
        if(!rt)
            return 0;
        simulateClick(rt);
        return 1+makeGmailSpace(targetForm,neededInputs-1);
    }

    //---------------------------------------------------------------------------------------------------------
    // Drag And Drop Handler
    //---------------------------------------------------------------------------------------------------------
    function checkFileUrlsOrPath(s)
    {
        s = s.substr(0,1024)
        a = s.split("\n")
        for(var i = 0; i < a.length; i++)
        {
            if(a[i].match(/file\:\/\/|\/.*|\\.*|[A-Za-z]\:\\.*/))
                return true;
        }
        return false;
    }

    var dragDropHandler = 
    {
        canHandleMultipleItems: true,

        /// supports the x-moz-file shell object with the interface nsIFile
        /// supports the custom x2-moz-file for dropping from out sidebar
        /// supports the unicode as lines with file names
        getSupportedFlavours : function () {
            var flavours = new FlavourSet();
            flavours.appendFlavour("application/x-moz-file","nsIFile");	// real D&D
            flavours.appendFlavour("application/x2-moz-file"); // D&D from our script
            flavours.appendFlavour("text/unicode");
            flavours.appendFlavour("text/plain");
            flavours.appendFlavour("text/x-moz-url");
            /*
            flavours.appendFlavour("text/x-moz-url-data");
            flavours.appendFlavour("text/x-moz-url-desc");
            flavours.appendFlavour("application/x-moz-file-promise-url");
            flavours.appendFlavour("application/x-moz-file-promise-dest-filename");
            flavours.appendFlavour("application/x-moz-file-promise-url");*/
            flavours.appendFlavour("FileContents")
            return flavours;
        },
        onDragStart: function (evt , transferData, action){},
        onDragOver: function (evt,flavour,session) {},
        onDrop : function (evt,transferData, session) 
      {
        evt.preventDefault();
        try
        {
        /*
            In the case of canHandleMultipleItems
            
            transferData is a TransferDataSet with the property datalist containing TransferData objects
            with the property datalist containing FlavourData that have (supports contentLength flavour _XferID data)
            
            TransferDataSet
                .dataList
                    TransferData
                        .dataList
                            FlavourData
                                supports
                                contentLength
                                _XferID
                                flavour
                                    contentType
                                data => gets the real data
                    
            When it is off then transferData is the first item of the first flavour
        */
        // prepare a variable that contains always a single item
            var td = this.canHandleMultipleItems ? transferData.first.first : transferData;
            var multi = true; // (this.canHandleMultipleItems && transferData.dataList.length > 1) || (evt.target.tagName != "INPUT");
            switch(td.flavour.contentType)
            {
            case "text/unicode":
                {
                    s = td.data
                    if(startsWith(s,"From - ") && s.indexOf("Subject:") > 0)
                        this.applyFiles(evt, prepareTemporaryFile(s,"email",".eml"));
                    // TODO make RE
                    else if((startsWith(s,"<!DOCTYPE") && s.indexOf("html>") > 0) || startsWith(s,"<html>") || startsWith(s,"<xhtml>"))
                        this.applyFiles(evt, prepareTemporaryFile(s,"page",".html"));
                    else if(startsWith(s,"<?xml"))
                        this.applyFiles(evt, prepareTemporaryFile(s,"doc",".xml"));
                    else if(!checkFileUrlsOrPath(s))
                        this.applyFiles(evt, prepareTemporaryFile(s,"doc",".txt"));
                    else
                    {
                        // check if there are multiple files ...
                        if(multi)
                        {
                            lines = s.split("\n")
                            // assume all of flavour moz-file
                            var files = [];
                            for(var i = 0; i < lines.length; i++)
                            {
                                s = lines[i]
                                if(s.substr(0,7) == "file://")
                                {
                                    s = s.substr(7);
                                    files.push(s)
                                }
                                else if(s.length > 0)
                                {
                                    //alert("Skipped " + s)
                                }
                                    
                            }
                            this.applyFiles(evt, files);
                        }
                    }
                }
                break;
            case "application/x2-moz-file":
                {
                    // check if there are multiple files ...
                    if(multi)
                    {
                        // assume all of flavour moz-file
                        var files = [];
                        for(var i = 0; i < transferData.dataList.length; i++)
                        {
                            var td = transferData.dataList[i];
                            for(var j = 0; j < td.dataList.length; j++)
                            {
                                var fd = td.dataList[j];
                                if(fd.flavour.contentType == "application/x2-moz-file")
                                {
                                    var s = fd.data + "";
                                    if(s.substr(0,7) == "file://")
                                        s = s.substr(7);
                                    files.push(s);
                                }
                            }
                        }
                        this.applyFiles(evt, files);
                    }
                }
                break;
            case "text/x-moz-url":
            case "application/x-moz-file":
                {
                    // check if there are multiple files ...
                    if(multi)
                    {
                        // assume all of flavour moz-file
                        var files = [];
                        for(var i = 0; i < transferData.dataList.length; i++)
                        {
                            var td = transferData.dataList[i];
                            
                            for(var j = 0; j < td.dataList.length; j++)
                            {
                                var fd = td.dataList[j];
                                if(fd.flavour.contentType == "application/x-moz-file")
                                {
                                    files.push(fd.data.path);
                                }
                            }
                        }
                        this.applyFiles(evt, files);
                    }
                }
                break;
            default:
                {
                    alert("Unknown Flavor " + td.flavour.contentType);
                    for(var i = 0; i < transferData.dataList.length; i++)
                    {
                        var td = transferData.dataList[i];
                        for(var j = 0; j < td.dataList.length; j++)
                        {
                            var fd = td.dataList[j];
                            alert(fd.flavour.contentType);
                            alert(fd.data);
                        }
                    }
                }
                break;
            }
        }
        catch(e)
        {
            alert("DragDropUpload onDrop " + e);
            myDump(dumpObject(transferData,0,3));
            // Components.utils.reportError(e);
        }
      },
      
      // effectively applies the files specified as local paths
      applyFiles: function(evt, files) 
      {
            try
            {
                if(files == undefined)
                    return
                var processedFileCount = 0;
                var lastProcessedField = null;
                var tform = null;
                var nameMode;
                var lastCount = 0;
                var attacher;
                if ("getDragData" in nsDragAndDrop)
                    _drop = "dragdrop";
                else
                    _drop = "drop";

                // Dropped into an INPUT field that has been already marked. We know now the form
                if(evt.target._ddtarget)
                {
                    var rt = evt.target._ddtarget;
                    if(rt == "form")
                    {
                        tform = evt.target;
                    }
                    else if(rt == "pressme")
                    {
                        tform = evt.target.form;
                        attacher = evt.target;
                        //alert("Drop on clip " + tform)
                    }
                    else
                    {
                        tform = rt.form;            
                        nameMode = analyzeName(rt.name);
                        //alert("Using form " + tform + " in " + rt + " " + rt.name);
                    }
                }
                
                // Dropped somewhere, find the corresponding form
                if(!tform)
                {
                    tform = findParentForm(evt.target)
                    if(!tform)
                    {
                        alert("Cannot drop a file here (no form found)");
                        return;
                    }
                }
                if(tform.ddattacher)
                {
                    attacher = tform.ddattacher;
                }
                if(typeof(attacher) == "string")
                {
                    attacher = tform.ownerDocument.getElementById(attacher);
                }
                
                //solve Windows links
                for(var i = 0; i < files.length;i++)
                {
                    try {
                        x = makeFileFromPathFollow(files[i])
                        if(x)
                        {
                            if(x.path != x.target)
                                files[i] = x.target;
                        }
                    }
                    catch(e)
                    {
                    }
                }
                
                nodynamic = false
                
                // we do not use getElementsByTagName because sometimes people do form/
                var aInputFields = tform.getElementsByTagName("INPUT");
                if(aInputFields.length == 0)
                    aInputFields = tform.parentNode.getElementsByTagName("INPUT");
                for(var i = 0; i < aInputFields.length && processedFileCount < files.length; i++)
                {
                    var f = aInputFields[i];
                    if(f.type == "file" && f.value == "")
                    {
                        nameMode = analyzeName(f.name);
                        if (nameMode.number > lastCount)
                            lastCount = nameMode.number
                        f.value = files[processedFileCount];
                        processedFileCount++
                        simulateOnChange(f);
                        lastProcessedField = f;
                        
                        // if the form is a form with post entry. In that case all the form is changed?
                        /*
                        try
                        {
                            if(tform.elements["Attach"] && tform.elements["Attach"].className == "btn")
                            {
                                simulateClick(tform.elements["Attach"])
                                // wait for completion
                                nodynamic =true
                                break
                            }
                        }
                        catch(e)
                        {
                        }*/
                    }
                }
                
                // more to do
                if(processedFileCount < files.length)        
                {
                    if(nodynamic)
                    {
                        alert("Multiple files drop not yet implemented with this website")
                    }
                    else if(!this.dynamicMode)
                    {
                        alert("DragDropUpload. Dynamic mode disabled. Some files could not be added: " + (files.length-processedFileCount));
                    }
                    else
                    {
                        if(attacher)
                        {
                            for(var i = 0; i < files.length-processedFileCount;i++)
                                simulateClick(attacher);
                            
                            var aInputFields = tform.getElementsByTagName("INPUT");
                            for(var i = 0; i < aInputFields.length && processedFileCount < files.length; i++)
                            {
                                var f = aInputFields[i];
                                if(f.type == "file" && f.value == "")
                                {
                                    nameMode = analyzeName(f.name);
                                    if (nameMode.number > lastCount)
                                        lastCount = nameMode.number
                                    f.value = files[processedFileCount++];
                                    simulateOnChange(f);
                                    lastProcessedField = f;
                                }
                            }						
                        }
                        else if(makeGmailSpace(tform,files.length-processedFileCount) != 0)
                        {
                            var aInputFields = tform.getElementsByTagName("INPUT");
                            for(var i = 0; i < aInputFields.length && processedFileCount < files.length; i++)
                            {
                                var f = aInputFields[i];
                                if(f.type == "file" && f.value == "")
                                {
                                    nameMode = analyzeName(f.name);
                                    if (nameMode.number > lastCount)
                                        lastCount = nameMode.number
                                    f.value = files[processedFileCount++];
                                    simulateOnChange(f);
                                    lastProcessedField = f;
                                }
                            }						
                        }							
                        else if(lastProcessedField)
                        {
                            try
                            {
                                for(; processedFileCount < files.length;)
                                {							
                                    var x = tform.ownerDocument.createElement("INPUT");
                                    x.type = "file";
                                    x.size = lastProcessedField.size;
                                    x["onChange"] = lastProcessedField["onChange"];
                                    x["class"] = lastProcessedField["class"];
                                    //x["style"] = rt["style"];
                                    if(nameMode)
                                    {
                                        if (nameMode.type == "number")
                                        {
                                            ++lastCount;
                                            x.name = nameMode.prefix + lastCount;
                                        }
                                        else
                                            x.name = nameMode.prefix
                                    }
                                    x.value = files[processedFileCount++];							
                                    x.addEventListener("dragover", onover,false);
                                    x.addEventListener(_drop, ondrop,false);
                                    x.addEventListener("dragenter", showDragCursor, false);
                                    
                                    try
                                    {
                                    x.readOnly = false;
                                    }
                                    catch(e)
                                    {
                                    }
                                    x._ddtarget = x;		
                                    simulateOnChange(x);							
                                    try
                                    {
                                        lastProcessedField.parentNode.insertBefore(x,lastProcessedField.nextSibling);				
                                    }
                                    catch(e)
                                    {
                                        tform.appendChild(x);
                                    }
                                    lastProcessedField = x;
                                }					
                            }
                            catch(e)
                            {
                                alert("DragDropUpload: Exception during input generation: " + e);
                            }
                        }
                        if(processedFileCount < files.length)
                            alert("DragDropUpload: Some files could not be dropped " + (files.length-processedFileCount) + " add more input fields if possible.");
                    }
                }
            }
            catch(e)
            {
                alert("DragDropUpload: applyFiles Exception " + e);
            }  
      }
    };

    /**
     * This is the event on the Element, invoking the nsDragAndDrop handler 
     * Use our dragDropHandler
     *
     *
     * mDragSession.dataTransfer
     */
    function onover(event) 
    {
        try {
            dragDropHandler.canHandleMultipleItems = true;
            dragDropHandler.dynamicMode = true;
            nsDragAndDrop.dragOver(event,dragDropHandler);
            event.returnValue = false;
            event.preventDefault();
        }
        catch(ex)
        {

        }
    };

    /**
     * show dragging cursor on over
     */
    function showDragCursor(event) 
    {
        event.returnValue = false;
        //event.dataTransfer.dropEffect = "copy";
    }

    /**
     * Use our dragDropHandler on Dropping
     */
    function ondrop(event) 
    {
        try 
        {
            nsDragAndDrop.drop(event,dragDropHandler);
            event.returnValue = false;
            event.preventDefault();
        }
        catch(ex)
        {
            alert("ex error!" + ex)
        }
    };

    //---------------------------------------------------------------------------------------------------------
    // Navigation Messages Observer
    //---------------------------------------------------------------------------------------------------------

    function NavObserver(oContentWindow)
    {
        this.m_oContentWindow = oContentWindow;
        this.m_sWindowID = ''+parseInt(Math.random()*32767);
        this.m_sLastDataUrl = 'about:blank';	// The last url that we drove our display to.
    }

    NavObserver.prototype.observe =
        function (oSubject, sMessage, sContextUrl)
        {
            try {
                if (oSubject != this.m_oContentWindow) {
                    // only pay attention to our client window.
                    return;
                }
                
                var bReferrer = (this.m_oContentWindow.document.referrer)?true:false;
                if ((sMessage == 'EndDocumentLoad') && (sContextUrl != this.m_oContentWindow.location)) {
                        // we were redirected...
                    sContextUrl = '' + this.m_oContentWindow.location;
                    bReferrer = true;
                }
                this.TrackContext(sContextUrl, bReferrer);
            } catch(ex) {
            }
        }

    NavObserver.prototype.GetCDT =
        function (bReferrer)
        {
            var sCDT = '';
            sCDT += 't=' +(bReferrer?'1':'0');
            sCDT += '&pane=nswr6';
            sCDT += '&wid='+this.m_sWindowID;

            return encodeURIComponent(sCDT);
        }


    NavObserver.prototype.TrackContext =
        function (sContextUrl, bReferrer)
        {
            try {
                // attach to the document change => get document loading complete => get list of input 
                // maybe attach to the document new element
                var win = this.oWindow;	
                if(win == null)
                {
                    return;
                }
                var doc = this.oWindow.document;	
                var content = doc.getElementById("content");
                if(content == null)
                    content = doc.getElementById("browser_content");
                // Prior to the landing of the WHATWG drag API in Gecko 1.9.1,
                // the event name was "dragdrop"
                if ("getDragData" in nsDragAndDrop)
                    _drop = "dragdrop";
                else
                    _drop = "drop";
                if (content != null) 
                {
                    var page = content.contentDocument;								
                    try
                    {
                        var unsafeWindow = this.m_oContentWindow.wrappedJSObject
                        try
                        {
                            unsafeWindow._dragdropupload = true;
                        }
                        catch(e) 
                        {
                            alert(e); 
                        }
                        
                        // gmonkey interface for checking for gmail
                        try
                        {
                            //var gmonkey = unsafeWindow.gmonkey
                            //if(gmonkey != undefined)
                            {
                                var forms = getElementsByTagNameDeep(page,"form");
                                for(var i = 0; i < forms.length; i++)
                                {
                                    var f = forms[i]
                                    if(f["_ddtarget"])
                                        continue
                                    var spans = getElementsByTagNameDeep(forms[i],"span");
                                    for(var j = 0; j < spans.length; j++)
                                    {
                                        var t = spans[j].innerHTML
                                        if(t.match(reAttachFile) || t.match(reAttachAnotherFile))
                                        {
                                            f.addEventListener("dragover", onover,false)
                                            f.addEventListener(_drop, ondrop,false)
                                            f.addEventListener("dragenter", showDragCursor, false)
                                            f._ddtarget = "form";
                                            break;
                                        }
                                    }
                                    q = basecampattach(f)
                                    if(q)
                                    {
                                        q.addEventListener("dragover", onover,false);
                                        q.addEventListener(_drop, ondrop,false);
                                        q.addEventListener("dragenter", showDragCursor, false);
                                        q._ddtarget = "pressme";
                                        f.ddattacher = q;
                                        adj++;
                                    }
                                }
                            }
                        }
                        catch(e) { 
                            alert(e); 
                        }
                    }
                    catch(e)
                    {
                        alert(e); 
                    }
                    
                    //all inputs
                    var adj = 0;
                    var forms = getElementsByTagNameDeep(page,"form");
                    for(var i = 0; i < forms.length; i++)
                    {
                        var f = forms[i];
                        if(f["_ddtarget"])
                            continue
                        dx = f.getAttribute("ddattacher")
                        if(dx)
                        {
                            f.addEventListener("dragover", onover,false)
                            f.addEventListener(_drop, ondrop,false)
                            f.addEventListener("dragenter", showDragCursor, false)
                            f._ddtarget = "form";
                            
                            f.ddattacher = dx;
                        }
                        else 
                        {
                            q = basecampattach(f)
                            if(q)
                            {
                                q.addEventListener("dragover", onover,false);
                                q.addEventListener(_drop, ondrop,false);
                                q.addEventListener("dragenter", showDragCursor, false);
                                
                                q._ddtarget = "pressme";
                                f.ddattacher = q;
                                adj++;
                            }
                        }
                    }
                    
                    
                    
                    var inputs = getElementsByTagNameDeep(page,"input");
                    for(var i = 0; i < inputs.length; i++)
                    {				
                        var x = inputs[i];
                        if(x.type == "file" && !("_ddtarget" in x))
                        {
                            // static input fields
                            x.addEventListener("dragover", onover,false);
                            x.addEventListener(_drop, ondrop,false);
                            x.addEventListener("dragenter", showDragCursor, false);
                            
                            try
                            {
                                x.readOnly = false;
                            }
                            catch(e)
                            {}
                            x._ddtarget = x;
                            adj++;
                        }
                    }
                    
                    //all inputs
                    var buttons = getElementsByTagNameDeep(page,"button");
                    for(var i = 0; i < buttons.length; i++)
                    {				
                        var x = buttons[i];
                        if(x.form)
                        {
                            // find child img with attach inside
                            if(x["title"] == "Attach" || kerioattach(x))
                            {
                                // static input fields
                                x.addEventListener("dragover", onover,false);
                                x.addEventListener(_drop, ondrop,false);
                                x.addEventListener("dragenter", showDragCursor, false);
                                
                                x._ddtarget = "pressme";
                                x.form.ddattacher = x;
                                adj++;
                            }
                        }
                    }
                }
            }catch(ex) {			
                alert("DragDropUpload exception in track  " + ex);
            }
        }

    NavObserver.prototype.TranslateContext =
    function (sUrl, bReferrer)
    {
        if (!sUrl || ('string' != typeof(sUrl))
            || ('' == sUrl) || sUrl == 'about:blank') {
            return kUnknownReasonUrl;
        }

        // Strip off any query strings (Don't want to be too nosy).
        var nQueryPart = sUrl.indexOf('?');
        if (nQueryPart != 1) {
            sUrl = sUrl.slice(0, nQueryPart);
        }

        // We can only get related links data on HTTP URLs
        if (0 != sUrl.indexOf("http://")) {
            return kNoHTTPReasonUrl;
        }

        // ...and non-intranet sites(those that have a '.' in the domain)
        var sUrlSuffix = sUrl.substr(7);			// strip off "http://" prefix

        var nFirstSlash = sUrlSuffix.indexOf('/');
        var nFirstDot = sUrlSuffix.indexOf('.');

        if (-1 == nFirstDot)
            return kNoHTTPReasonUrl;

        if ((nFirstSlash < nFirstDot) && (-1 != nFirstSlash))
            return kNoHTTPReasonUrl;

        // url is http, non-intranet url: see if the domain is in their blocked list.

        var nPortOffset = sUrlSuffix.indexOf(":");
        var nDomainEnd = (((nPortOffset >=0) && (nPortOffset <= nFirstSlash))
                          ? nPortOffset : nFirstSlash);

        var sDomain = sUrlSuffix;
        if (-1 != nDomainEnd) {
            sDomain = sUrlSuffix.substr(0,nDomainEnd);
        }

        if (DomainInSkipList(sDomain)) {
            return kSkipDomainReasonUrl;
        } else {
            // ok! it is a good url!
            var sFinalUrl = kDataPrefixUrl;
            sFinalUrl += 'cdt='+this.GetCDT(bReferrer);
            sFinalUrl += '&url='+sUrl;
            return sFinalUrl;
        }
    }

    //---------------------------------------------------------------------------------------------------------
    // Hooking to the Window and the current object
    //---------------------------------------------------------------------------------------------------------
    pub.init = function ()
    {
        function initPitIntegration(evt) {
            oContentWindow = window._content;
            
            if (oContentWindow) {
                var oObserverService = Components.classes["@mozilla.org/observer-service;1"].getService();
                oObserverService = oObserverService.QueryInterface(Components.interfaces.nsIObserverService);
        
                var oNavObserver = new NavObserver(oContentWindow);
                oNavObserver.TrackContext(''+oContentWindow.location);
                oNavObserver.oWindow = window;
        
                if (oObserverService && oNavObserver) {
                    oObserverService.addObserver(oNavObserver, "StartDocumentLoad", false);
                    oObserverService.addObserver(oNavObserver, "EndDocumentLoad", false);
                    oObserverService.addObserver(oNavObserver, "FailDocumentLoad", false);
                } else {
                    oNavObserver = null;
                }

                // Attach a timer to track the dynamic input fields			
                try
                {
                    var s = ''+oContentWindow.location;
                    oNavObserver.timeout = window.setInterval(function () { oNavObserver.TrackContext(s); },1500);
                }
                catch(e)
                {
                    alert("DragDropUpload init Exception " + e);
                }
            }	
            else
                alert("DD not found");
        }
        window.addEventListener("load", initPitIntegration, false);			// this works also for Mozilla
        addEventListener("load", initPitIntegration, false);				// required for Firebird
    }

    return pub;
}
();

it.teslacore.dragdropupload.init();