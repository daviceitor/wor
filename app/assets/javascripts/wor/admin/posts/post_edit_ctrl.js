(function () {
  var PostDetailCtrl = function ($scope, $rootScope, $timeout, $state, $stateParams, $location, $filter, Upload, postsFactory, classifiersFactory, usersFactory) {

    $scope.data = $scope.data || {};
    $scope.data.cover_image_url = '/assets/wor/no-photo-grey.png';

    $scope.tagTransform = function (newTag) {
      return {id: newTag, name: newTag};
    };

    var load_post = function(post_id) {
      if (post_id) {
        postsFactory.get(post_id).success(function(response){
          $scope.data.post = response.data;
          if ($scope.data.post.cover_image_url!='') {
            $scope.data.cover_image_url = $scope.data.post.cover_image_url+'?' + new Date().getTime();
          }

          $scope.data.post.publication_date_formated = $filter('date')($scope.data.post.publication_date, 'yyyy-MM-dd');
          $scope.data.post.publication_hour_formated = $filter('date')($scope.data.post.publication_date, 'hh:mm');

          classifiersFactory.find({classifier_type: 'tag'}).success(function(response){
            $scope.data.tags = response.data;
            $scope.data.post.tags = _.intersectionBy($scope.data.tags, $scope.data.post.classifiers, 'id');
          });
        });
      }
    }

    load_post($stateParams.post_id);

    $scope.tinymceOptions = {
      setup: function(editor) {
          //Focus the editor on load
          // $timeout(function(){ editor.focus(); });
          editor.on("init", function() {});
          editor.on("click", function() {});
      },
      inline: false,
      plugins : 'advlist autolink link image media lists charmap print preview code table',
      skin: 'lightgray',
      theme : 'modern',
      toolbar1: 'bold italic strikethrough bullist numlist blockquote| styleselect | alignleft aligncenter alignright alignjustify | outdent indent | link unlink | image media | table | removeformat | preview fullpage | code',
      toolbar2: 'styleselect shorcodes_button',
      menubar: false,
      force_p_newlines : false,
      force_br_newlines : false,
      convert_newlines_to_brs : false,
      remove_linebreaks : true,   
      forced_root_block : false,
      relative_urls: false,
      remove_script_host: false,
      height: 500,
      style_formats: [
        { title: 'h1', block: 'h1' },
        { title: 'h2', block: 'h2' },
        { title: 'h3', block: 'h3' },
        { title: 'h4', block: 'h4' },
        { title: 'h5', block: 'h5' },
        { title: 'h6', block: 'h6' }
      ],
      setup: function(editor) {
        editor.addButton('shorcodes_button', {
          type: 'menubutton',
          text: 'Shortcodes',
          icon: false,
          menu: [
            {text: 'Widget modelo', onclick: function() {editor.insertContent('[qm_widget_modelo modelo=SLUGMODELO flotar=derecha]');}},
            {text: 'Enlace grande para ofertas de un modelo', onclick: function() {editor.insertContent('[qm_widget_offerprice_link modelo=SLUGMODELO mensaje_con_precio=no]');}},
            {text: 'Enlace pequeño para ofertas de modelo', onclick: function() {editor.insertContent('[qm_widget_popup_offer_link modelo=SLUGMODELO texto="TEXTO"]');}},
            {text: 'Widget comparativa', onclick: function() {editor.insertContent('[qm_widget_comparativa_modelos slug1=SLUGMODELO1 slug2=SLUGMODELO2 slug3=SLUGMODELO3 ]');}}
          ]
        });
      },

      file_picker_callback : function (callback, value, meta) {
        tinymce.activeEditor.windowManager.open({
          file: '/wor/elfinder_manager/',// use an absolute path!
          title: 'Images explorer',
          width: 900,
          height: 450,
          resizable: 'yes'
        }, {
          oninsert: function (file, elf) {
            var url, reg, info;

            // URL normalization
            url = file.url;
            reg = /\/[^/]+?\/\.\.\//;
            while(url.match(reg)) {
              url = url.replace(reg, '/');
            }

            url = urlBase+url;

            // Provide file and text for the link dialog
            if (meta.filetype == 'file') {
              callback(url, {text: info, title: info});
            }

            // Provide image and alt text for the image dialog
            if (meta.filetype == 'image') {
              callback(url, {alt: info});
            }

            // Provide alternative source and posted for the media dialog
            if (meta.filetype == 'media') {
              callback(url);
            }
          }
        }
        );
        return false;
      }
    }

    classifiersFactory.find({classifier_type: 'category'}).success(function(response){
      $scope.data.categories = response.data;
    });

    usersFactory.find().success(function(response){
      $scope.data.users = response.data;
    });

    $scope.save = function(status) {
      var _post = _.clone($scope.data.post, true);

      _post.status = status;
      _post.publication_date = _post.publication_date_formated+' '+_post.publication_hour_formated;

      postsFactory.update(_post).success(function(response){
        $scope.$emit('WOR-RELOAD_POSTS');
        load_post($scope.data.post.id);
      });
    }

    $scope.close = function() {
      $('.post-view').addClass('animated slideOutDown');
      timeout = $timeout(function(){
        $state.go($state.$current.parent);
        $scope.data.post = {};
      }, 200);
    }

    $scope.upload = function (file) {
      if (file) {
        $scope.data.progress_upload_file = 0;
        $scope.data.is_upload_file = true;

        Upload.upload({
          url: 'http://localhost:3000/wor/api/v1/posts/'+$scope.data.post.id+'/upload_cover_image.json',
          fields: $scope.data.post,
          file: file

        }).progress(function (evt) {
          $scope.data.progress_upload_file = parseInt(100.0 * evt.loaded / evt.total);

        }).success(function (response, status, headers, config) {
          $scope.data.progress_upload_file = 100;
          $scope.data.is_upload_file = false;
          $scope.data.post = response.data;
          if ($scope.data.post.cover_image_url!='') {
            $scope.data.cover_image_url = $scope.data.post.cover_image_url+'?' + new Date().getTime();
          }

        }).error(function (data, status, headers, config) {
            console.log('error status: ' + status);
            $scope.data.is_upload_file = false;
        });
      }
    };

    $scope.delete = function() {
      if (confirm("¿Estás seguro de eliminar este post?")) {
        postsFactory.delete($scope.data.post.id).success(function(response){
          $scope.$emit('WOR-RELOAD_POSTS');
          $scope.close();
        });
      }
    }

    $scope.preview = function() {
      window.open($scope.data.post.draft_path)
    }

    $scope.force_show_slug = false;
    $scope.set_show_slug = function(force) {
      $scope.force_show_slug = force;
    }

    $scope.is_show_slug = function() {
      if ($scope.force_show_slug) { return $scope.force_show_slug }
      if ($scope.data.post && $scope.data.post.status=='published') {return false;}

      return true;
    }

    $scope.is_published = function() {
      if ($scope.data.post)
        return $scope.data.post.status == 'published';
    }

    $(document).ready(function(){
      $('.input-date').datepicker({
        format: "yyyy-mm-dd",
        language: "es",
        orientation: "top right",
        autoclose: true,
        toggleActive: true,
        todayHighlight: true
      });
    });
  }

  angular.module('wor').controller('PostDetailCtrl', ["$scope", "$rootScope", "$timeout", "$state", "$stateParams", "$location", "$filter", "Upload", "postsFactory", "classifiersFactory", "usersFactory", PostDetailCtrl]);
}());