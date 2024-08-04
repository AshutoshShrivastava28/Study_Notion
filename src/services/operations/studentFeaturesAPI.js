import { toast } from "react-hot-toast";
import { studentEndpoints } from "../apis";
import { apiConnector } from "../apiconnector";
import rzpLogo from "../../assets/Logo/rzp_logo.png";
import { setPaymentLoading } from "../../slices/courseSlice";
import { resetCart } from "../../slices/cartSlice";

const {
  COURSE_PAYMENT_API,
  COURSE_VERIFY_API,
  SEND_PAYMENT_SUCCESS_EMAIL_API,
} = studentEndpoints;

function loadScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;

    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export async function buyCourse(
  token,
  courses,
  userDetails,
  navigate,
  dispatch
) {
  const toastId = toast.loading("Loading...");
  try {
    //load the script
    const res = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!res) {
      toast.error("RazorPay SDK failed to load");
      return;
    }

    //initiate the order
    const orderResponse = await apiConnector(
      "POST",
      COURSE_PAYMENT_API,
      { courses },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message);
    }
    console.log("PRINTING orderResponse", orderResponse);

    if (orderResponse && orderResponse.data) {
      // Log the data for debugging purposes
      console.log("Order response data:", orderResponse.data);

      // Assuming the order details are directly inside `orderResponse.data`
      const orderData = orderResponse.data;

      // Ensure orderData contains the required properties
      if (orderResponse && orderResponse.data && orderResponse.data.success) {
        console.log("Order response data:", orderResponse.data);

        // The order data is within orderResponse.data.data
        const orderData = orderResponse.data.data;

        // Ensure orderData contains the required properties
        if (
          orderData &&
          orderData.amount &&
          orderData.currency &&
          orderData.id
        ) {
          const { amount, currency, id } = orderData;

          const options = {
            key: process.env.RAZORPAY_KEY,
            currency,
            amount: `${amount}`,
            order_id: id,
            name: "StudyNotion",
            description: "Thank You for Purchasing the Course",
            image: rzpLogo,
            prefill: {
              name: `${userDetails.firstName}`,
              email: userDetails.email,
            },
            handler: function (response) {
              sendPaymentSuccessEmail(response, amount, token);
              verifyPayment(
                { ...response, courses },
                token,
                navigate,
                dispatch
              );
            },
          };

          const paymentObject = new window.Razorpay(options);
          paymentObject.open();
          paymentObject.on("payment.failed", function (response) {
            toast.error("Oops, payment failed");
            console.log(response.error);
          });
        } else {
          console.error("Invalid order data:", orderData);
          // Handle the error case, e.g., show an error message to the user
        }
      } else {
        console.error(
          "Invalid order response or payment creation unsuccessful:",
          orderResponse
        );
        // Handle the error case, e.g., show an error message to the user
      }
    }
  } catch (error) {
    console.log("PAYMENT API ERROR.....", error);
    toast.error("Could not make Payment");
  }
  toast.dismiss(toastId);
}

async function sendPaymentSuccessEmail(response, amount, token) {
  try {
    await apiConnector(
      "POST",
      SEND_PAYMENT_SUCCESS_EMAIL_API,
      {
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        amount,
      },
      {
        Authorization: `Bearer ${token}`,
      }
    );
  } catch (error) {
    console.log("PAYMENT SUCCESS EMAIL ERROR....", error);
  }
}

//verify payment
async function verifyPayment(bodyData, token, navigate, dispatch) {
  const toastId = toast.loading("Verifying Payment....");
  dispatch(setPaymentLoading(true));
  try {
    const response = await apiConnector("POST", COURSE_VERIFY_API, bodyData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    toast.success("payment Successful, ypou are addded to the course");
    navigate("/dashboard/enrolled-courses");
    dispatch(resetCart());
  } catch (error) {
    console.log("PAYMENT VERIFY ERROR....", error);
    toast.error("Could not verify Payment");
  }
  toast.dismiss(toastId);
  dispatch(setPaymentLoading(false));
}
