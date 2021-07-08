function imagesInit () {
    var scrollBarSize = getBrowserScrollSize();
    var $btn_previous = $("#btn_previous");
    var $btn_next = $("#btn_next");
    var $btn_save = $("#btn_save");
    var $btn_settings = $("#btn_settings");
    var $btn_settings_update = $("#form_settings #btn_update");
    var $annotation_window = $("#annotation-window-container");
    var settings = {
        source: ""
    };
    var service_host = window.location.host;

    $btn_previous.bind('click', previousImage);
    $btn_next.bind('click', nextImage);
    $btn_save.bind('click', saveAnnotation);
    $btn_settings.bind('click', showSettings);
    $("#settings_modal").on("hidden.bs.modal", resetModal);
    $btn_settings_update.bind('click', updateSettings);

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
            if (settings.source) {
                $.ajax({
                    dataType: "json",
                    url: "http://" + service_host + "/files?storage=" + settings.source + "&offset=0&limit=5",
                    success: function(data) {
                        if (data.result != "ok") {
                            showWarningToast("operation failed", data.message);
                        }
                        settings.total = data.total;
                        var image_url = "http://" + service_host + "/file?storage=" + settings.source + "&number=1";
                        $.ajax({
                            url: image_url + "&info=true",
                            processData: false,
                            success: function(data) {
                                if (data.result != "ok") {
                                    showWarningToast("operation failed", data.message);
                                }
                                var img = new Image();
                                img.src = image_url;
                                $annotation_window.append(img);
                                var file_name = data["file"]["name"];
                                var file_path = data["file_path"];
                                console.log(file_name, file_path);
                                settings.current = 1;
                            },
                            error: function() {
                                showWarningToast("error", "request file failed");
                            }
                        });
                        settings.current = 1;
                        console.log(data);
                    },
                    error: function() {
                        showWarningToast("error", "request files failed");
                    }
                });
            }
        }
        $('#settings_modal').modal('hide');
    }

    function previousImage() {

    }

    function nextImage() {

    }

    function saveAnnotation() {

    }

    function resetModal(e) {
        $("#" + e.target.id).find("input:text").val("");
        $("#" + e.target.id).find("input:file").val(null);
        $("#" + e.target.id).find("textarea").val("");
    }
}