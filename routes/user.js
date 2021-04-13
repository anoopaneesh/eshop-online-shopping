var express = require("express");
const { NotExtended } = require("http-errors");
const { Db } = require("mongodb");
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelper = require("../helpers/user-helpers");
const verifyLogin = (req,res,next) => {
  if(req.session.user){
    next()
  }else{
    res.redirect('/login')
  }
}
router.get("/", async (req, res, next) => {
  let user = req.session.user;
  let proLength = null
  if(user){
    proLength = await userHelper.getCartLength(user._id)
  }
  productHelper.getAllProducts().then((products) => {
    res.render("user/view-products", { products, admin: false, user,proLength });
  });
});

router.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.loginErr });
  }
});

router.post("/login", (req, res) => {
  userHelper.doLogin(req.body).then((data) => {
    if (data.status) {
      req.session.userloggedIn = true;
      req.session.user = data.user;
      res.redirect("/");
    } else {
      req.session.loginErr = "Invalid email or password";
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  res.redirect("/");
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  userHelper.doSignUp(req.body).then((data) => {
    req.session.userloggedIn = true;
    console.log(data)
    req.session.user = data;
    res.redirect("/");
  });
});

router.get('/cart',verifyLogin,(req,res)=>{
  userHelper.getCartProducts(req.session.user._id).then(async(products)=>{
    let total = await userHelper.getCartTotal(req.session.user._id)
    let user = req.session.user;
    let proLength = null
    if(user){
      proLength = await userHelper.getCartLength(user._id)
    }
    res.render('user/cart',{user:req.session.user,products,total,proLength})
  })
})

router.get('/add-to-cart/:id',(req,res)=>{
  let prodId = req.params.id
  let userId = req.session.user._id
  if(userId){
    userHelper.addToCart(prodId,userId).then((response)=>{
      res.json(response)
    })
  }
  
})

router.post('/change-product-quantity',(req,res)=>{
  
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    response.total = await userHelper.getCartTotal(req.body.userId)
    res.json(response)
  })
})

router.post('/remove-product',(req,res)=>{
  userHelper.deleteCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})

router.get('/place-order',verifyLogin,(req,res)=>{
  userHelper.getCartTotal(req.session.user._id).then(async(total)=>{
    let products = await userHelper.getCartProducts(req.session.user._id)
    proLength = await userHelper.getCartLength(req.session.user._id)
    res.render('user/place-order',{user:req.session.user,total,products,proLength})
  })
  
})

router.post('/place-order',async(req,res)=>{
  let total = await userHelper.getCartTotal(req.body.user)
  let products = await userHelper.getCartProductList(req.body.user)
  userHelper.placeOrder(req.body,products,total).then((response)=>{
    userHelper.removeCart(req.body.user)
    if(req.body['payment-method'] === 'COD'){
      res.json({status:true,order:response})
    }else{
      userHelper.generateRazorpay(response,total).then((order)=>{
        res.json(order)
      })
    }
  })
})
router.get('/order-placed',verifyLogin,(req,res)=>{
  res.render('user/order-placed',{user:req.session.user})
})


router.get('/view-orders',verifyLogin,(req,res)=>{
  userHelper.getAllOrders(req.session.user._id).then((response)=>{
    res.render('user/view-orders',{orders:response,user:req.session.user})
  })
  
})


router.get('/view-order-details/:id',verifyLogin,(req,res)=>{
  userHelper.getOrderDetails(req.session.user._id,req.params.id).then((details)=>{
    res.render('user/view-order-details',{user:req.session.user,details})
  })
})

router.post('/verify-payment',(req,res)=>{
  userHelper.verifyPayment(req.body).then(()=>{
    userHelper.changeOrderStatus(req.body.order.receipt)
    res.json({status:true})
  }).catch((err)=>{
    res.json({status:false})
  })
})


module.exports = router;
