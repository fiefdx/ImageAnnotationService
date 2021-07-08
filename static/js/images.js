function imagesInit (height_delta, vocabulary) {
    var scrollBarSize = getBrowserScrollSize();
    var $show_annotations = $("input#show-annotations");
    var $btn_previous = $("#btn_previous");
    var $btn_next = $("#btn_next");
    var $btn_save = $("#btn_save");
    var $btn_settings = $("#btn_settings");
    var $btn_settings_update = $("#form_settings #btn_update");
    var $btn_draw_type = $("#draw-type-selector label.btn-sm input");
    var $annotation_window = $("#annotation-window-container");
    var settings = {
        source: "",
        store: "",
        current: 0,
        total: 0,
        file_path: "",
        annotation_path: "",
        annotation_suffix: "_annotation",
        draw_type: "rect",
        show: true
    };
    var service_host = window.location.host;
    var annotation = null;

    $show_annotations.prop("checked", settings.show);
    $("#input-resource input").val("");
    $("#output-resource input").val("");
    $btn_previous.bind('click', previousImage);
    $btn_next.bind('click', nextImage);
    $btn_save.bind('click', saveAnnotation);
    $btn_settings.bind('click', showSettings);
    $("#settings_modal").on("hidden.bs.modal", resetModal);
    $btn_settings_update.bind('click', updateSettings);
    $btn_draw_type.bind('click', updateDrawType);
    $show_annotations.on('change', switchShowAnnotations);

    function showSettings() {
        if (settings.source) {
            $('#settings_modal input#source').val(settings.source);
        }
        $('#settings_modal').modal('show');
    }

    function updateSettings() {
        var source = $('#settings_modal input#source').val() || "";
        if (source != settings.source) {
            settings.source = source;
            $("#input-resource input").val("");
            $("#output-resource input").val("");
            if (settings.source) {
                settings.store = settings.source.match("ldfs://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")[0];
                $.ajax({
                    dataType: "json",
                    url: "http://" + service_host + "/images?storage=" + settings.source + "&offset=0&limit=5",
                    success: function(data) {
                        if (data.result != "ok") {
                            showWarningToast("operation failed", data.message);
                        }
                        settings.total = data.total;
                        settings.file_path = data.path;
                        settings.annotation_path = data.path + settings.annotation_suffix;
                        var image_url = "http://" + service_host + "/image?storage=" + settings.source + "&number=1";
                        $.ajax({
                            url: image_url + "&info=true",
                            processData: false,
                            success: function(data) {
                                if (data.result != "ok") {
                                    showWarningToast("operation failed", data.message);
                                }
                                if (annotation) {
                                    annotation.destroy();
                                }
                                var img = new Image();
                                img.id = "annotation_image";
                                img.src = image_url;
                                $annotation_window.empty();
                                img.height = $(window).height() - height_delta;
                                $annotation_window.append(img);
                                var file_name = data["file"]["name"];
                                var file_path = data["file_path"];
                                settings.current = 1;
                                $("span#current-image").text(settings.current);
                                $("span#total-images").text(settings.total);
                                $("#input-resource input").val(settings.file_path + "/" + file_name);
                                $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                                annotation = Annotorious.init({
                                    image: 'annotation_image',
                                    locale: 'auto',
                                    widgets: [
                                        {widget: 'COMMENT'},
                                        {widget: 'TAG', vocabulary: vocabulary}
                                    ]
                                });
                                annotation.setDrawingTool(settings.draw_type);
                                if (settings.show) {
                                    var annotation_url = "http://" + service_host + "/file?storage=" + settings.store + settings.annotation_path + "/" + file_name + ".json";
                                    $.ajax({
                                        type: "HEAD",
                                        url: annotation_url,
                                        processData: false,
                                        success: function(data, textStatus, request) {
                                            if (request.getResponseHeader("Exists") == "true") {
                                                annotation.loadAnnotations(annotation_url);
                                            }
                                        }
                                    });
                                }
                            },
                            error: function() {
                                showWarningToast("error", "request file failed");
                            }
                        });
                    },
                    error: function() {
                        showWarningToast("error", "request files failed");
                    }
                });
            }
        }
        if (source == "") {
            $("span#current-image").text(0);
            $("span#total-images").text(0);
            $("#input-resource input").val("");
            $("#output-resource input").val("");
        }
        $('#settings_modal').modal('hide');
    }

    function previousImage() {
        if (settings.source) {
            if (settings.current > 1) {
                settings.current -= 1;
            } else {
                settings.current = settings.total;
            }
            var image_url = "http://" + service_host + "/image?storage=" + settings.source + "&number=" + settings.current;
            $.ajax({
                url: image_url + "&info=true",
                processData: false,
                success: function(data) {
                    if (data.result != "ok") {
                        showWarningToast("operation failed", data.message);
                    }
                    if (annotation) {
                        annotation.destroy();
                    }
                    var img = new Image();
                    img.id = "annotation_image";
                    img.src = image_url;
                    $annotation_window.empty();
                    img.height = $(window).height() - height_delta;
                    $annotation_window.append(img);
                    var file_name = data["file"]["name"];
                    var file_path = data["file_path"];
                    $("span#current-image").text(settings.current);
                    $("span#total-images").text(settings.total);
                    $("#input-resource input").val(settings.file_path + "/" + file_name);
                    $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                    annotation = Annotorious.init({
                        image: 'annotation_image',
                        locale: 'auto',
                        widgets: [
                            {widget: 'COMMENT'},
                            {widget: 'TAG', vocabulary: vocabulary}
                        ]
                    });
                    annotation.setDrawingTool(settings.draw_type);
                    if (settings.show) {
                        var annotation_url = "http://" + service_host + "/file?storage=" + settings.store + settings.annotation_path + "/" + file_name + ".json";
                        $.ajax({
                            type: "HEAD",
                            url: annotation_url,
                            processData: false,
                            success: function(data, textStatus, request) {
                                if (request.getResponseHeader("Exists") == "true") {
                                    annotation.loadAnnotations(annotation_url);
                                }
                            }
                        });
                    }
                },
                error: function() {
                    showWarningToast("error", "request file failed");
                }
            });
        } else {
            showWarningToast("error", "need to set valid data source");
        }
    }

    function nextImage() {
        if (settings.source) {
            if (settings.current < settings.total) {
                settings.current += 1;
            } else {
                settings.current = 1;
            }
            var image_url = "http://" + service_host + "/image?storage=" + settings.source + "&number=" + settings.current;
            $.ajax({
                url: image_url + "&info=true",
                processData: false,
                success: function(data) {
                    if (data.result != "ok") {
                        showWarningToast("operation failed", data.message);
                    }
                    if (annotation) {
                        annotation.destroy();
                    }
                    var img = new Image();
                    img.id = "annotation_image";
                    img.src = image_url;
                    $annotation_window.empty();
                    img.height = $(window).height() - height_delta;
                    $annotation_window.append(img);
                    var file_name = data["file"]["name"];
                    var file_path = data["file_path"];
                    $("span#current-image").text(settings.current);
                    $("span#total-images").text(settings.total);
                    $("#input-resource input").val(settings.file_path + "/" + file_name);
                    $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                    annotation = Annotorious.init({
                        image: 'annotation_image',
                        locale: 'auto',
                        widgets: [
                            {widget: 'COMMENT'},
                            {widget: 'TAG', vocabulary: vocabulary}
                        ]
                    });
                    annotation.setDrawingTool(settings.draw_type);
                    if (settings.show) {
                        var annotation_url = "http://" + service_host + "/file?storage=" + settings.store + settings.annotation_path + "/" + file_name + ".json";
                        $.ajax({
                            type: "HEAD",
                            url: annotation_url,
                            processData: false,
                            success: function(data, textStatus, request) {
                                if (request.getResponseHeader("Exists") == "true") {
                                    annotation.loadAnnotations(annotation_url);
                                }
                            }
                        });
                    }
                },
                error: function() {
                    showWarningToast("error", "request file failed");
                }
            });
        } else {
            showWarningToast("error", "need to set valid data source");
        }
    }

    function saveAnnotation() {
        if (annotation) {
            var file_path = $("#output-resource input").val();
            var annotations = annotation.getAnnotations();
            var content = JSON.stringify(annotations, undefined, 4);
            var blob = new Blob([content], {type: "text/plain"});
            var file = new File([blob], "up_file", {type: "text/plain"});
            var file_form = new FormData();
            file_form.append("up_file", file);
            $.ajax({
                type: "POST",
                url:  "http://" + service_host + "/file?storage=" + settings.source.match("ldfs://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")[0] + file_path,
                data: file_form,
                contentType: false,
                processData: false,
                success: function(data) {
                    if (data.result != "ok") {
                        showWarningToast("operation failed", data.message);
                    } else {
                        showMessageToast("success", "save file successed");
                    }
                },
                error: function() {
                    showWarningToast("error", "request service failed");
                }
            });
        }
    }
    
    function switchShowAnnotations() {
        var enable = $(this).is(":checked");
        settings.show = enable;
        if (enable) {
            var annotation_path = $("#output-resource input").val();
            var annotation_url = "http://" + service_host + "/file?storage=" + settings.store + annotation_path;
            $.ajax({
                type: "HEAD",
                url: annotation_url,
                processData: false,
                success: function(data, textStatus, request) {
                    if (request.getResponseHeader("Exists") == "true") {
                        annotation.loadAnnotations(annotation_url);
                    }
                }
            });
        } else {
            annotation.clearAnnotations();
        }
    }

    function updateDrawType() {
        if (annotation) {
            settings.draw_type = $(this).attr("id"); // only ["rect", "polygon"]
            annotation.setDrawingTool(settings.draw_type);
        }
        $("#draw-type-selector label").removeClass("focus");
    }

    function resetModal(e) {
        $("#" + e.target.id).find("input:text").val("");
        $("#" + e.target.id).find("input:file").val(null);
        $("#" + e.target.id).find("textarea").val("");
    }
}