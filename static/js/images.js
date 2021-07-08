function imagesInit () {
    var scrollBarSize = getBrowserScrollSize();
    var $btn_previous = $("#btn_previous");
    var $btn_next = $("#btn_next");
    var $btn_save = $("#btn_save");
    var $btn_settings = $("#btn_settings");
    var $btn_settings_update = $('#form_settings #btn_update');
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