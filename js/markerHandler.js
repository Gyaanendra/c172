var tableNumber = null;

AFRAME.registerComponent("markerhandler", {
  init: async function () {
    if (tableNumber === null) {
      this.askTableNumber();
    }

    //Get the dishes collection
    var dishes = await this.getDishes();

    //makerFound Event
    this.el.addEventListener("markerFound", () => {
      if (tableNumber !== null) {
        var markerId = this.el.id;
        this.handleMarkerFound(dishes, markerId);
      }
    });
    //markerLost Event
    this.el.addEventListener("markerLost", () => {
      this.handleMarkerLost();
    });
  },
  askTableNumber: function () {
    var iconUrl =
      "https://raw.githubusercontent.com/whitehatjr/menu-card-app/main/hunger.png";
    swal({
      title: "Welcome to Hunger!!",
      icon: iconUrl,
      content: {
        element: "input",
        attributes: {
          placeholder: "Type your table number",
          type: "number",
          min: 1,
        },
      },
      closeOnClickOutside: false,
    }).then((inputValue) => {
      tableNumber = inputValue;
    });
  },

  handleMarkerFound: function (dishes, markerId) {
    // Getting today's day
    var todaysDate = new Date();
    var todaysDay = todaysDate.getDay();
    // Sunday - Saturday : 0 - 6
    var days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    //Get the dish based on ID
    var dish = dishes.filter((dish) => dish.id === markerId)[0];

    //Check if the dish is available
    if (dish.unavailable_days.includes(days[todaysDay])) {
      swal({
        icon: "warning",
        title: dish.dish_name.toUpperCase(),
        text: "This dish is not available today!!!",
        timer: 2500,
        buttons: false,
      });
    } else {
      //Changing Model scale to initial scale
      var model = document.querySelector(`#model-${dish.id}`);
      model.setAttribute("position", dish.model_geometry.position);
      model.setAttribute("rotation", dish.model_geometry.rotation);
      model.setAttribute("scale", dish.model_geometry.scale);

      //Update UI conent VISIBILITY of AR scene(MODEL , INGREDIENTS & PRICE)
      model.setAttribute("visible", true);

      var ingredientsContainer = document.querySelector(
        `#main-plane-${dish.id}`
      );
      ingredientsContainer.setAttribute("visible", true);

      var priceplane = document.querySelector(`#price-plane-${dish.id}`);
      priceplane.setAttribute("visible", true);

      //Changing button div visibility
      var buttonDiv = document.getElementById("button-div");
      buttonDiv.style.display = "flex";

      var ratingButton = document.getElementById("rating-button");
      var orderButton = document.getElementById("order-button");
      var OrderSummaryButton = document.getElementById("order-summary-button");
      var pay_button = document.getElementById("pay-button");

      if (tableNumber != null) {
        //Handling Click Events
        ratingButton.addEventListener("click", function () {
          swal({
            icon: "warning",
            title: "Rate Dish",
            text: "Work In Progress",
          });
        });

        orderButton.addEventListener("click", () => {
          var tNumber;
          tableNumber <= 9 ? (tNumber = `T0${tableNumber}`) : `T${tableNumber}`;
          this.handleOrder(tNumber, dish);

          swal({
            icon: "https://i.imgur.com/4NZ6uLY.jpg",
            title: "Thanks For Order !",
            text: "Your order will serve soon on your table!",
            timer: 2000,
            buttons: false,
          });
        });

        OrderSummaryButton.addEventListener("click", () => {
          this.handle_order_summary();
        });

        pay_button.addEventListener("click", () => {
          this.handle_payment();
        });
      }
    }
  },
  handleOrder: function (tNumber, dish) {
    // Reading current table order details
    firebase
      .firestore()
      .collection("tables")
      .doc(tNumber)
      .get()
      .then((doc) => {
        var details = doc.data();

        if (details["current_orders"][dish.id]) {
          // Increasing Current Quantity
          details["current_orders"][dish.id]["quantity"] += 1;

          //Calculating Subtotal of item
          var currentQuantity = details["current_orders"][dish.id]["quantity"];

          details["current_orders"][dish.id]["subtotal"] =
            currentQuantity * dish.price;
        } else {
          details["current_orders"][dish.id] = {
            item: dish.dish_name,
            price: dish.price,
            quantity: 1,
            subtotal: dish.price * 1,
          };
        }

        details.total_bill += dish.price;

        //Updating db
        firebase.firestore().collection("tables").doc(doc.id).update(details);
      });
  },

  handle_order_summary: async function () {
    var table;
    tableNumber <= 9 ? (table = `T0${tableNumber}`) : `T${tableNumber}`;
    var order_summary = await this.get_order_summary(table);
    var modal_div = getElementById("modal-div");
    modal_div.style.display = "flex";
    var table_body = getElementById("bill-table-body");
    table_body.innerHTML = "";
    var currentOrder = Object.keys(order_summary.current_orders);
    currentOrder.map((i) => {
      var table_row = document.createElement("tr");
      var item = document.createElement("td");
      var price = document.createElement("td");
      var quantity = document.createElement("td");
      var subtotal = document.createElement("td");

      item.innerHTML = order_summary.current_orders[i].item;
      price.innerHTML = "$" + order_summary.current_orders[i].price;
      quantity.innerHTML = order_summary.current_orders[i].quantity;
      subtotal.innerHTML = "$" + order_summary.current_orders[i].subtotal;

      price.setAttribute("class", "text-center");
      quantity.setAttribute("class", "text-center");
      subtotal.setAttribute("class", "text-center");

      table_row.appendChild(item);
      table_row.appendChild(price);
      table_row.appendChild(quantity);
      table_row.appendChild(subtotal);

      table_body.appendChild(table_row);

      var total_bill_tr = document.createElement("tr");
      var td1 = document.createElement("td");
      var td2 = document.createElement("td");
      var td3 = document.createElement("td");
      var td4 = document.createElement("strong");

      td4.innerHTML = "Total:";

      td1.setAttribute("class", "no-line");
      td2.setAttribute("class", "no-line");
      td3.setAttribute("class", "no-line text-center");

      td3.appendChild(td4);

      var td_tb = document.createElement("td");
      td_tb.innerHTML = "$" + order_summary.total_bill;

      total_bill_tr.appendChild(td1);
      total_bill_tr.appendChild(td2);
      total_bill_tr.appendChild(td3);
      total_bill_tr.appendChild(td_tb);
    });
  },

  get_order_summary: async function (table) {
    return await firebase
      .firestore()
      .collection("tables")
      .doc(table)
      .get()
      .then((doc) => doc.data());
  },

  //Function to get the dishes collection from db
  getDishes: async function () {
    return await firebase
      .firestore()
      .collection("Dishes")
      .get()
      .then((snap) => {
        return snap.docs.map((doc) => doc.data());
      });
  },
  handleMarkerLost: function () {
    //Changing button div visibility
    var buttonDiv = document.getElementById("button-div");
    buttonDiv.style.display = "none";
  },

  handle_payment: function () {
    document.getElementById("modal-div").style.display = "none";
    var tNum
    tableNumber <= 9 ? (tNum = `T0${tableNumber}`) : `T${tableNumber}`;
    firebase
    .firestore()
    .collection("tables")
    .doc(tNum)
    .update({
      current_orders:{},
      total_bill:0,
    })
    .then(()=>{
      swal({
        icon: "success",
        title:"Payment Success",
        text: "we have Successfully robbed you ",
        timer: 2500,
        buttons: false,
      })
    })
  },
});
