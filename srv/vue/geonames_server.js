var eventBus = new Vue()

/**
 * =====================================================================================================================
 * Product Component
 * =====================================================================================================================
 */
Vue.component('geonames-server', {
  props: {
  }
, template : `
  <div class="admin-screen">
    <h1>{{ title }}</h1>

    <ul>
      <span class="tabs" 
        :class="{ activeTab: selectedTab === index }"
        @click="selectedTab = index"
        v-for="(tab, index) in adminScreenTabs"
        :key="index">
        {{ tab }}
      </span>
    </ul>

    <div v-show="selectedTab === 0">
      <ui5-button type="Emphasized">Tab {{ selectedTab }}</ui5-button>
    </div>

    <div v-show="selectedTab === 1">
      <ui5-button type="Positive">Tab {{ selectedTab }}</ui5-button>
    </div>
  </div>
`
, data() {
    return {
      title           : "GeoNames Server using HANA"
    , adminScreenTabs : ["Country List", "Server Status"]
    , selectedTab     : 0
    }
  }
, methods : {
  }
, computed : {
  }
, mounted() {
    eventBus.$on('review-submitted', productReview => this.reviews.push(productReview))
  }
})

/**
 * =====================================================================================================================
 * Main Application
 * =====================================================================================================================
 */
var geonamesApp = new Vue({
  el: '#geonames-app'
, data : { }
, methods : {  }
})
