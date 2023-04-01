function imagesInit (height_delta, vocabulary) {
    var scrollBarSize = getBrowserScrollSize();
    var $current_image = $("input#current-image");
    var $total_images = $("input#total-images");
    var $btn_play = $("#btn_play");
    var $btn_load_previous = $("#btn_load_previous");
    var $btn_refresh = $("#btn_refresh");
    var $show_annotations = $("input#show-annotations");
    var $btn_previous = $("#btn_previous");
    var $interval = $("input#interval");
    var $btn_next = $("#btn_next");
    var $btn_save = $("#btn_save");
    var $btn_settings = $("#btn_settings");
    var $btn_settings_update = $("#form_settings #btn_update");
    var $btn_draw_type = $("#draw-type-selector label.btn-sm input");
    var $annotation_window = $("#annotation-window-container");
    var $settings_source = $('#settings_modal input#source');
    var $settings_target = $('#settings_modal input#target');
    var settings = {
        source: "",
        target: "",
        store: "",
        target_store: "",
        current: 0,
        total: 0,
        file_path: "",
        annotation_path: "",
        annotation_suffix: "_annotation",
        draw_type: "rect",
        show: true,
        cache: [],
        interval: 1,
        play: false,
        frame_ready: false,
        current_file_name: "",
        previous_file_name: "",
    };
    var service_host = window.location.host;
    var annotation = null;
    var play_timer = null;
    var sleep_time = 500;

    refreshPlayButton();
    $current_image.val(settings.current);
    $total_images.val(settings.total);
    $btn_play.bind('click', autoPlay);
    $btn_load_previous.bind('click', loadPreviousAnnotation);
    $show_annotations.prop("checked", settings.show);
    $interval.val(settings.interval);
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
    $settings_source.on('change', autoGenerateTarget);
    $interval.on('change', changeInterval);
    $current_image.on('change', gotoImage);

    function autoPlay() {
        if (settings.play) {
            settings.play = false;
            document.getElementById("annotation_image").onloadend = null;
            clearTimeout(play_timer);
        } else {
            settings.play = true;
            play_timer = setInterval(play, sleep_time);
        }
        refreshPlayButton();
    }

    function refreshPlayButton() {
        if (settings.play) {
            $("#btn_play span").removeClass("oi-media-play");
            $("#btn_play span").addClass("oi-media-pause");
        } else {
            $("#btn_play span").removeClass("oi-media-pause");
            $("#btn_play span").addClass("oi-media-play");
        }
    }

    function play() {
        document.getElementById("annotation_image").onloadend = function() {
            nextImage();
        }
        nextImage();
    }

    function showSettings() {
        if (settings.source) {
            $settings_source.val(settings.source);
            $settings_target.val(settings.target);
        }
        $('#settings_modal').modal('show');
    }

    function updateSettings() {
        var source = $settings_source.val() || "";
        var target = $settings_target.val();
        if (source && target && (source != settings.source || target != settings.annotation_path)) {
            settings.source = source;
            settings.target = target;
            $("#input-resource input").val("");
            $("#output-resource input").val("");
            if (settings.source) {
                settings.store = settings.source.match("ldfs://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")[0];
                settings.target_store = settings.target.match("ldfs://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")[0];
                $.ajax({
                    dataType: "json",
                    url: "http://" + service_host + "/images?storage=" + settings.source + "&offset=0&limit=5",
                    success: function(data) {
                        if (data.result != "ok") {
                            showWarningToast("operation failed", data.message);
                        }
                        settings.total = data.total;
                        settings.file_path = data.path;
                        settings.target = settings.target;
                        settings.annotation_path = settings.target.replace(settings.target_store, "");
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
                                settings.current_file_name = file_name;
                                settings.current = 1;
                                $("input#current-image").val(settings.current);
                                $("input#total-images").val(settings.total);
                                $("#input-resource input").val(settings.file_path + "/" + file_name);
                                $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                                annotation = Annotorious.init({
                                    image: 'annotation_image',
                                    locale: 'auto',
                                    widgets: [
                                        {widget: 'TAG', vocabulary: vocabulary}
                                    ]
                                });
                                annotation.setDrawingTool(settings.draw_type);
                                var annotation_url = "http://" + service_host + "/file?storage=" + settings.target_store + settings.annotation_path + "/" + file_name + ".json";
                                loadAnnotations(annotation_url);
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
            $("input#current-image").val(0);
            $("input#total-images").val(0);
            $("#input-resource input").val("");
            $("#output-resource input").val("");
        }
        $('#settings_modal').modal('hide');
    }

    function gotoImage() {
        var n = Number($(this).val());
        if (n != settings.current) {
            if (n < 1) {
                n = 1;
            } else if (n > settings.total) {
                n = settings.total;
            }
            settings.current = n;
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
                    var img = document.getElementById("annotation_image");
                    img.src = image_url;
                    img.height = $(window).height() - height_delta;
                    var file_name = data["file"]["name"];
                    var file_path = data["file_path"];
                    $("input#current-image").val(settings.current);
                    $("input#total-images").val(settings.total);
                    $("#input-resource input").val(settings.file_path + "/" + file_name);
                    $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                    annotation = Annotorious.init({
                        image: 'annotation_image',
                        locale: 'auto',
                        widgets: [
                            {widget: 'TAG', vocabulary: vocabulary}
                        ]
                    });
                    annotation.setDrawingTool(settings.draw_type);
                    var annotation_url = "http://" + service_host + "/file?storage=" + settings.target_store + settings.annotation_path + "/" + file_name + ".json";
                    loadAnnotations(annotation_url);
                },
                error: function() {
                    showWarningToast("error", "request file failed");
                }
            });
        }
    }

    function previousImage() {
        if (settings.source) {
            if (settings.current > settings.interval) {
                settings.current -= settings.interval;
                settings.previous_file_name = settings.current_file_name;
            } else {
                settings.current = settings.total;
                settings.previous_file_name = "";
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
                    var img = document.getElementById("annotation_image");
                    img.src = image_url;
                    img.height = $(window).height() - height_delta;
                    var file_name = data["file"]["name"];
                    var file_path = data["file_path"];
                    settings.current_file_name = file_name;
                    $("input#current-image").val(settings.current);
                    $("input#total-images").val(settings.total);
                    $("#input-resource input").val(settings.file_path + "/" + file_name);
                    $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                    annotation = Annotorious.init({
                        image: 'annotation_image',
                        locale: 'auto',
                        widgets: [
                            {widget: 'TAG', vocabulary: vocabulary}
                        ]
                    });
                    annotation.setDrawingTool(settings.draw_type);
                    var annotation_url = "http://" + service_host + "/file?storage=" + settings.target_store + settings.annotation_path + "/" + file_name + ".json";
                    loadAnnotations(annotation_url);
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
            if (settings.current + settings.interval <= settings.total) {
                settings.current += settings.interval;
                settings.previous_file_name = settings.current_file_name;
            } else {
                settings.current = 1;
                settings.previous_file_name = "";
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
                    var img = document.getElementById("annotation_image");
                    img.src = image_url;
                    img.height = $(window).height() - height_delta;
                    var file_name = data["file"]["name"];
                    var file_path = data["file_path"];
                    settings.current_file_name = file_name;
                    $("input#current-image").val(settings.current);
                    $("input#total-images").val(settings.total);
                    $("#input-resource input").val(settings.file_path + "/" + file_name);
                    $("#output-resource input").val(settings.annotation_path + "/" + file_name + ".json");
                    annotation = Annotorious.init({
                        image: 'annotation_image',
                        locale: 'auto',
                        widgets: [
                            {widget: 'TAG', vocabulary: vocabulary}
                        ]
                    });
                    annotation.setDrawingTool(settings.draw_type);
                    var annotation_url = "http://" + service_host + "/file?storage=" + settings.target_store + settings.annotation_path + "/" + file_name + ".json";
                    loadAnnotations(annotation_url);
                },
                error: function() {
                    showWarningToast("error", "request file failed");
                }
            });
        } else {
            showWarningToast("error", "need to set valid data source");
        }
    }

    function loadPreviousAnnotation() {
        if (settings.previous_file_name) {
            var annotation_url = "http://" + service_host + "/file?storage=" + settings.target_store + settings.annotation_path + "/" + settings.previous_file_name + ".json";
            loadAnnotations(annotation_url);
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
                url:  "http://" + service_host + "/file?storage=" + settings.target_store + file_path,
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
            var tmp = annotation.getAnnotations();
            settings.cache = settings.cache.concat(tmp);
            annotation.setAnnotations(settings.cache);
        } else {
            settings.cache = annotation.getAnnotations();
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

    function loadAnnotations(annotation_url) {
        $.ajax({
            type: "HEAD",
            url: annotation_url,
            processData: false,
            success: function(data, textStatus, request) {
                if (request.getResponseHeader("Exists") == "true") {
                    $.ajax({
                        type: "GET",
                        url: annotation_url,
                        processData: false,
                        success: function(data) {
                            settings.cache = JSON.parse(data);
                            if (settings.show) {
                                annotation.setAnnotations(settings.cache);
                            }
                        }
                    });
                } else {
                    settings.cache = [];
                }
            }
        });
    }

    function autoGenerateTarget() {
        var source = $settings_source.val();
        if (source != "") {
            $settings_target.val(source + settings.annotation_suffix);
        } else {
            $settings_target.val("");
        }
    }

    function changeInterval() {
        settings.interval = Number($(this).val());
        if (settings.interval < 1) {
            settings.interval = 1;
        }
        $(this).val(settings.interval);
    }

    function resetModal(e) {
        $("#" + e.target.id).find("input:text").val("");
        $("#" + e.target.id).find("input:file").val(null);
        $("#" + e.target.id).find("textarea").val("");
    }
}