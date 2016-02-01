deps = ['ionic', 'ngCordova', 'satellizer', 'ionic-datepicker'];

agg = angular.module('agg', deps).filter(  
    'to_trusted', ['$sce', function ($sce) {  
        return function (text) {  
            return $sce.trustAsHtml(text);  
        }  
    }]
);

agg.run(function($rootScope, $state) {
  // $stateChangeStart is fired whenever the state changes. We can use some parameters
  // such as toState to hook into details about the state as it is changing
  $rootScope.$on('$stateChangeStart', function(event, toState) {

      // Grab the user from local storage and parse it to an object
      var user = JSON.parse(localStorage.getItem('user'));            

      // If there is any user data in local storage then the user is quite
      // likely authenticated. If their token is expired, or if they are
      // otherwise not actually authenticated, they will be redirected to
      // the auth state because of the rejected request anyway
      if(user) {

          // The user's authenticated state gets flipped to
          // true so we can now show parts of the UI that rely
          // on the user being logged in
          $rootScope.authenticated = true;

          $rootScope.token = localStorage.getItem('satellizer_token'); 
          // Putting the user's data on $rootScope allows
          // us to access it anywhere across the app. Here
          // we are grabbing what is in local storage
          $rootScope.currentUser = user;

          // If the user is logged in and we hit the auth route we don't need
          // to stay there and can send the user to the main state
          if(toState.name === "auth") {

              // Preventing the default behavior allows us to use $state.go
              // to change states
              event.preventDefault();

              // go to the "main" state which in our case is users
              $state.go('users');
          }       
      }
  });
});

agg.factory('Camera', ['$q', function($q){
  return {
    getPicture: function(options){
      var q = $q.defer();

      navigator.camera.getPicture(function(result){
        q.resolve(result);
      }, function(err){
        q.reject(err);
      }, options);

      return q.promise;
    }
  }
}]).factory("SessionService", function() {
  return {
    get: function(key) {
      return sessionStorage.getItem(key);
    },
    set: function(key, val) {
      return sessionStorage.setItem(key, val);
    },
    unset: function(key) {
      return sessionStorage.removeItem(key);
    }
  }
});

//set up route
agg.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $compileProvider, $authProvider, $httpProvider, $provide) {
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel|blob):|data:image\//);
  $ionicConfigProvider.views.maxCache(5);
  // note that you can also chain configs
  $ionicConfigProvider.backButton.text('返回').icon('ion-chevron-left')
    // agg.routeProvider  = $routeProvider;
    // $routeProvider.
    //     when('/user', {templateUrl: 'views/user.html'}).
    //     otherwise({redirectTo: '/'});
  $stateProvider
    .state('tabs', {
    url: "/",
    abstract: true,
    templateUrl: "view/tabs.html",
  }).state('login', {
    url: '/login',
    templateUrl: 'view/auth/login.html'
  }).state('register', {
    url: '/register',
    templateUrl: 'view/auth/register.html'
  }).state('tabs.user', {
    url: 'user',
    abstract: true,
    views: {
      'user-tab': {
        templateUrl: 'view/user/index.html',
        controller: 'UserController as user'
      }
    }
  }).state('tabs.user.main', {
    url: '/main',
    views: {
      'user-index': {
        templateUrl: 'view/user/main.html',
      }
    }
  }).state('tabs.user.detail', {
    url: '/detail',
    views: {
      'user-index': {
        templateUrl: 'view/user/detail.html',
      }
    }
  }).state('tabs.user.gender', {
    url: '/gender',
    views: {
      'user-index': {
        templateUrl: 'view/user/gender.html',
      }
    }
  }).state('tabs.user.province', {
    url: '/province',
    views: {
      'user-index': {
        templateUrl: 'view/user/region/province.html',
      }
    }
  }).state('tabs.user.city', {
    url: '/city',
    views: {
      'user-index': {
        templateUrl: 'view/user/region/city.html',
      }
    }
  }).state('tabs.user.area', {
    url: '/area',
    views: {
      'user-index': {
        templateUrl: 'view/user/region/area.html',
      }
    }
  }).state('tabs.pet', {
      url: 'pet',
      abstract: true,
      views: {
        'pet-tab': {
          templateUrl: "view/pet/index.html",
          controller: 'PetController'
        }
      }
  }).state('tabs.pet.list', {
      url: '/list',
      views: {
        'pet-index': {
          templateUrl: "view/pet/list.html",
        }
      }
  });

  $urlRouterProvider.otherwise("pet/list");

  function redirectWhenLoggedOut($q, $injector) {
    return {
      responseError: function(rejection) {
        // Need to use $injector.get to bring in $state or else we get
        // a circular dependency error
        var $state = $injector.get('$state');

        // Instead of checking for a status code of 400 which might be used
        // for other reasons in Laravel, we check for the specific rejection
        // reasons to tell us if we need to redirect to the login state
        var rejectionReasons = ['token_not_provided', 'token_expired', 'token_absent', 'token_invalid'];

        // Loop through each rejection reason and redirect to the login
        // state if one is encountered
        angular.forEach(rejectionReasons, function(value, key) {

          if(rejection.data.error === value) {
            // If we get a rejection corresponding to one of the reasons
            // in our array, we know we need to authenticate the user so 
            // we can remove the current user from local storage
            localStorage.removeItem('user');

            // Send the user to the auth state so they can login
            $state.go('login');
          }
        });
        return $q.reject(rejection);
      }
    }
  }

  // Setup for the $httpInterceptor
  $provide.factory('redirectWhenLoggedOut', redirectWhenLoggedOut);

  // Push the new factory onto the $http interceptor array
  $httpProvider.interceptors.push('redirectWhenLoggedOut');

  $authProvider.loginUrl = BACKENDURL + '/api/auth/authenticate';
  $authProvider.signupUrl = BACKENDURL + '/api/auth/register';
});

agg.controller('AppController', function($scope, $timeout, $http){
  $scope.$on('$ionicView.beforeEnter', function(){ //This is fired twice in a row
    // console.log(arguments);
    stateId = arguments[1].stateId;
    if(stateId === 'tabs.user.detail' || stateId === 'tabs.user.gender' || stateId === 'tabs.user.province' || stateId === 'tabs.user.city' || stateId === 'tabs.user.area'){
      $("#tabs").addClass('tabs-item-hide');
    }else{
      $("#tabs").removeClass('tabs-item-hide');
    }
  });

  $scope.getAllProvinces = function(){
    $http({
      url: BACKENDURL + '/api/region/province',
      method: "GET",
      params: {}
    }).success(function(data, status) {
      $scope.provinces = data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };
  $scope.getAllProvinces();

  $scope.getCitiesForProvince = function(id){
    $http({
      url: BACKENDURL + '/api/region/province/' + id + '/city',
      method: "GET",
      params: {}
    }).success(function(data, status) {
      $scope.cities = data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };

  $scope.getAreasForCity = function(id){
    $http({
      url: BACKENDURL + '/api/region/city/' + id + '/area',
      method: "GET",
      params: {}
    }).success(function(data, status) {
      $scope.areas = data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };

  $scope.getProvinceById = function(id){
    $http({
      url: BACKENDURL + '/api/region/province/' + id,
      method: "GET",
      params: {}
    }).success(function(data, status) {
      return data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };

  $scope.getCityById = function(id){
    $http({
      url: BACKENDURL + '/api/region/city/' + id,
      method: "GET",
      params: {}
    }).success(function(data, status) {
      return data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };

  $scope.getAreaById = function(id){
    $http({
      url: BACKENDURL + '/api/region/area/' + id,
      method: "GET",
      params: {}
    }).success(function(data, status) {
      return data;
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };


  $scope.newDatePicker = function(options, disabledDates, callback){
    var monthList = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    var weekDaysList = ["日", "一", "二", "三", "四", "五", "六"];

    options.disabledDates = disabledDates;
    options.weekDaysList = weekDaysList;
    options.monthList = monthList;
    options.callback = callback;

    return datePicker = options;
  };
});

agg.controller('AuthController', function($scope, $http, $auth, $state, $ionicModal, $rootScope){
  $scope.login = function() {
    if($rootScope.authenticated !== true){
      var credentials = {
          email: $('#loginUserName').val(),
          password: $('#loginUserPassword').val()
      };
      // Use Satellizer's $auth service to login
      $auth.login(credentials).then(function(data) {
          // If login is successful, redirect to the user state
          $rootScope.token = data.data.token;
          return $http({
            url: BACKENDURL + '/api/auth/authenticate/user',
            method: "GET",
            params: {}
          }).success(function(data, status) {
            
          }).error(function(data, status){
            console.log(data + ' status:' + status);
          });
      }, function(error) {
          $scope.loginError = true;
          $scope.loginErrorText = error.data.error;
      // Because we returned the $http.get request in the $auth.login
      // promise, we can chain the next promise to the end here
      }).then(function(response) {
        // Stringify the returned data to prepare it
        // to go into local storage
        var user = JSON.stringify(response.data.user);

        // Set the stringified user data into local storage
        localStorage.setItem('user', user);

        // The user's authenticated state gets flipped to
        // true so we can now show parts of the UI that rely
        // on the user being logged in
        $rootScope.authenticated = true;

        $rootScope.token = response.data.token;

        // Putting the user's data on $rootScope allows
        // us to access it anywhere across the app
        $rootScope.currentUser = response.data.user;

        // Everything worked out so we can now redirect to
        // the users state to view the data
        // $state.go('tabs.user');
        $state.go('tabs.pet.list');
        $rootScope.$broadcast('userAuthChange');
      });
    }
  };

  $scope.logout = function() {
    if($rootScope.authenticated === true){
      $auth.logout().then(function() {
        console.log("User loged out2");
        // Remove the authenticated user from local storage
        localStorage.removeItem('user');

        // Flip authenticated to false so that we no longer
        // show UI elements dependant on the user being logged in
        $rootScope.authenticated = false;

        // Remove the current user info from rootscope
        $rootScope.currentUser = null;
        $scope.checkAuthorization();
        $rootScope.$broadcast('userAuthChange');
      });
    }
  };

  $scope.checkAuthorization = function(){
    if($rootScope.authenticated !== true){
      $state.go('login');
    }
  };

  $scope.signup = function(){
    if($rootScope.authenticated !== true){
      var credentials = {
        name: $('#registerUserName').val(),
        email: $('#registerEmail').val(),
        password: $('#registerUserPassword').val()
      };

      $auth.signup(credentials).then(function(response) {
        // Redirect user here to login page or perhaps some other intermediate page
        // that requires email address verification before any other part of the site
        // can be accessed.
        console.log(response);
        $state.go('login');
      }).catch(function(response) {
        // Handle errors here.
        console.log(response);
      });
    }
  }
});

agg.controller('UserController', function($scope, $http, $auth, $state, $ionicModal, $rootScope, $ionicHistory){
  $scope.genderOptions = [{
    text: "男",
    value: "男",
  }, {
    text: "女",
    value: "女",
  }];

  $scope.userUpdateValue = {};

  $scope.initUserData = function(){
    if($rootScope.currentUser){
      $scope.user = $rootScope.currentUser;
      if(!$scope.user.avatar){
        $scope.user.avatar = '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';
      }
      if(!$scope.user.gender || $scope.user.gender === '未设置'){
        $scope.user.gender = '未设置';
      }else{
        $scope.userUpdateValue.gender = $scope.user.gender;
      }
      if(!$scope.user.birthday || $scope.user.birthday === '未设置' || $scope.user.birthday === '0000-00-00'){
        $scope.user.birthday = '未设置';
      }else{
        $scope.userUpdateValue.birthday = $scope.user.birthday;
      }
      if(!$scope.user.province_id && !$scope.user.city_id && !$scope.user.area_id){
        $scope.user.region = '未设置';
      }else{
        // $scope.userUpdateValue.region_id = $scope.user.region_id;
      }
    }
  };

  $scope.initUserData();

  $scope.userUpdate = function(){
    console.log($scope.userUpdateValue);
    $http({
      url: BACKENDURL + '/api/user/update',
      method: "POST",
      params: $scope.userUpdateValue
    }).success(function(data, status) {
      $scope.getUserData();
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  }

  $scope.getUserData = function(){
    $http({
      url: BACKENDURL + '/api/auth/authenticate/user',
      method: "GET",
      params: {}
    }).success(function(data, status) {
      $rootScope.currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      $scope.initUserData();
    }).error(function(data, status){
      console.log(data + ' status:' + status);
    });
  };

  $scope.selProvince = function(id){
    $scope.userUpdateValue.province_id = id;
    $scope.getCitiesForProvince(id);
    $state.go('tabs.user.city');
  }

  $scope.selCity = function(id){
    $scope.userUpdateValue.city_id = id;
    $scope.getAreasForCity(id);
    $state.go('tabs.user.area');
  }

  $scope.selArea = function(id){
    $scope.userUpdateValue.area_id = id;
    $scope.userUpdate();
    $ionicHistory.goBack(-3);
  }

  $scope.userBirthdayDatePicker = $scope.newDatePicker({
    titleLabel: '出生日期',  //Optional
    todayLabel: '今天',  //Optional
    closeLabel: '取消',  //Optional
    setLabel: '确定',  //Optional
    mondayFirst: true,  //Optional
    inputDate: '',
    templateType: 'modal', //Optional
    showTodayButton: 'true', //Optional
    modalHeaderColor: 'bar-positive', //Optional
    modalFooterColor: 'bar-positive', //Optional
    from: new Date(1900, 0, 1), //Optional
    to: new Date(),  //Optional
    dateFormat: 'yyyy' + '年' + 'MM' + '月' + 'dd' + '日', //Optional
    closeOnSelect: false, //Optional
  }, [], function(val){
    if (typeof(val) === 'undefined') {
      console.log('未选择日期');
    } else {
      $scope.userBirthdayDatePicker.inputDate = val;
      $scope.userUpdateValue.birthday = val;
      $scope.userUpdate();
      console.log('选择的日期为 : ', val)
    }
  });
});

agg.controller('PetController', function($rootScope, $scope, $http, $ionicModal, $ionicActionSheet, $state, $timeout, Camera){
  $scope.showPicSelectActionSheet = function() {
    // Show the action sheet
    var hideSheet = $ionicActionSheet.show({
      buttons: [
        { text: '拍照' },
        { text: '从相册选取' }
      ],
      titleText: '为龟宝宝选张大头照吧',
      cancelText: '取消',
      cancel: function() {
        hideSheet();
      },
      buttonClicked: function(index) {
        switch(index){
          case 0:
            hideSheet();
            // $scope.getPhoto({
            //   quality: 100,
            //   targetWidth: 100,
            //   targetHeight: 100,
            //   allowEdit: false,
            //   destinationType: navigator.camera.DestinationType.DATA_URL,
            //   sourceType: navigator.camera.PictureSourceType.CAMERA,
            //   saveToPhotoAlbum: false
            // });
            $scope.openCreatePetModal();
            break;
          case 1:
            hideSheet();
            // $scope.getPhoto({
            //   quality: 100,
            //   targetWidth: 100,
            //   targetHeight: 100,
            //   allowEdit: false,
            //   destinationType: navigator.camera.DestinationType.DATA_URL,
            //   sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY,
            //   saveToPhotoAlbum: false
            // });
            $scope.openCreatePetModal();
            break;
          default:
            hideSheet();
            break;
        }
      }
    });
  };

   $scope.getPhoto = function(options){
    Camera.getPicture(options).then(function(imageData){
      console.log(imageData);
      var imageURI = "data:image/jpeg;base64," + imageData;
      $scope.avatarData = imageData;
      $scope.avatarURI = imageURI;
      $scope.openCreatePetModal();
    }, function(err){
      console.err(err);
    });
  };

  $ionicModal.fromTemplateUrl('view/pet/create.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.createPetModal = modal;
  });

  $scope.openCreatePetModal = function() {
    $scope.createPetModal.show();

    $scope.avatarData = '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';
    $scope.avatarURI = 'data:image/jpeg;base64,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';

    $('#createPetAvatar').attr('src', $scope.avatarURI);
  };
  $scope.closeCreatePetModal = function() {
    $scope.createPetModal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.createPetModal.remove();
  });
  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
  // Execute action
  });
  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
  // Execute action
  });

  $scope.petBirthdayDatePicker = $scope.newDatePicker({
    titleLabel: '出生/领养日期',  //Optional
    todayLabel: '今天',  //Optional
    closeLabel: '取消',  //Optional
    setLabel: '确定',  //Optional
    mondayFirst: true,  //Optional
    inputDate: '',
    templateType: 'modal', //Optional
    showTodayButton: 'true', //Optional
    modalHeaderColor: 'bar-positive', //Optional
    modalFooterColor: 'bar-positive', //Optional
    from: new Date(1980, 0, 1), //Optional
    to: new Date(),  //Optional
    dateFormat: 'yyyy' + '年' + 'MM' + '月' + 'dd' + '日', //Optional
    closeOnSelect: false, //Optional
  }, [], function(val){
    if (typeof(val) === 'undefined') {
      console.log('未选择日期');
    } else {
      $scope.petBirthdayDatePicker.inputDate = val;
      console.log('选择的日期为 : ', val)
    }
  });
  
  $scope.createPet = function(){
    var petData = {};
    petData.petName = $("#createPetName").val();
    petData.avatarData = $scope.avatarData;
    if($scope.petBirthdayDatePicker.inputDate){
      petData.createPetBirthday = $scope.petBirthdayDatePicker.inputDate;
    }
    petData.createPetCategory= $("#createPetCategory").val();

    $http.post(BACKENDURL + "/api/pet/store", petData,{}).success(function(data, status){
      if(data && status == 200){
        $scope.refreshPetList();
        $scope.closeCreatePetModal();
      }else{
        alert("create unsuccess");
        console.debug(data + " status:" + status);
      }
    }).error(function(data, status) {
              
    });
  };

  $scope.getAllPets = function(){
    $http({
        url: BACKENDURL + "/api/pet/all",
        method: "GET",
        params: {
        }
    }).success(function(data, status) {
      $scope.pets = data;
      for(var pet = 0; pet < $scope.pets.length; pet++){
        // $scope.pets[pet].decodedAvatar = base64decode($scope.pets[pet].avatar);
        // console.log($scope.pets[pet].decodedAvatar);
        switch($scope.pets[pet].category){
          case "0":
            $scope.pets[pet].categoryName = '陆龟';
            break;
          case "1":
            $scope.pets[pet].categoryName = '水龟';
            break;
          case "2":
            $scope.pets[pet].categoryName = '半水龟';
            break;
          default:
            break;
        }
        $scope.$broadcast('scroll.refreshComplete');
      }
    }).error(function(data, status) {
      console.debug(status);
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  if($rootScope.authenticated === true){
      $scope.getAllPets();
  }else{
    $scope.checkAuthorization();
  }

  $rootScope.$on('userAuthChange',function (){
    $scope.refreshPetList();
  });

  $scope.refreshPetList = function() {
    $scope.getAllPets();
  };
});