deps = ['ionic'];

agg = angular.module('agg', deps).filter(  
    'to_trusted', ['$sce', function ($sce) {  
        return function (text) {  
            return $sce.trustAsHtml(text);  
        }  
    }]
);

//set up route
agg.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
  $ionicConfigProvider.views.maxCache(5);
  // note that you can also chain configs
  $ionicConfigProvider.backButton.text('返回').icon('ion-chevron-left')
    // agg.routeProvider  = $routeProvider;
    // $routeProvider.
    //     when('/user', {templateUrl: 'views/user.html'}).
    //     otherwise({redirectTo: '/'});
  $stateProvider
    .state('pet', {
      url: '/pet',
      templateUrl: 'view/pet/index.html'
  })
    .state('pet.list', {
      url: '/list',
      templateUrl: 'view/pet/list.html'
  });

  $urlRouterProvider.otherwise("/pet/list");
});

agg.controller('appController', function($scope, $timeout, $http){
  $scope.test = 'testangular';
  
});

agg.controller('petController', function($scope, $http, $ionicModal, $ionicActionSheet, $timeout){
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
            $scope.openCreatePetModal();
            break;
          case 1:
            hideSheet();
            $scope.openCreatePetModal();
            break;
          default:
            hideSheet();
            break;
        }
      }
    });
  };



  $ionicModal.fromTemplateUrl('view/pet/create.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });
  $scope.openCreatePetModal = function() {
    $scope.modal.show();
  };
  $scope.closeCreatePetModal = function() {
    $scope.modal.hide();
  };
  //Cleanup the modal when we're done with it!
  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });
  // Execute action on hide modal
  $scope.$on('modal.hidden', function() {
  // Execute action
  });
  // Execute action on remove modal
  $scope.$on('modal.removed', function() {
  // Execute action
  });
  
});